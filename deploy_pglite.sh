#!/usr/bin/env bash
# deploy_pglite.sh — deploy canvas-node to Fly.io in PGlite-on-volume mode.
#
# Stop-gap while we wait for new @effectstream/db features that make Neon
# viable in production (opt-out of pg_ivm + pg pool reconnect handling for
# ECONNRESETs from Neon's serverless-compute autosuspend).
#
# What this does:
#   1. Ensures the Fly app exists.
#   2. Ensures the batcher_data volume exists in $REGION (also holds the
#      PGlite data dir at /app/batcher-data/pgdata — one volume serves
#      both since combined footprint stays well under 1GB).
#   3. Removes any stale Neon-pointing secrets that would otherwise
#      override the localhost DB_HOST baked into fly.node.pglite.toml.
#   4. Warns about missing required secrets (chain config, signer key).
#   5. Deploys with fly.node.pglite.toml.
#
# Reversible: `fly deploy --config fly.node.toml` switches back to Neon
# (the pgdata subdir on the volume stays untouched — safe to leave).
#
# Overridable via env:
#   FLY_APP_NAME      app name             (default: canvas-node)
#   FLY_REGION        region               (default: iad)
#   BATCHER_SIZE_GB   batcher volume size  (default: 1, Fly's minimum)
#
# Flags:
#   --reset           Wipe the PGlite data dir on the next boot. Sets
#                     PGLITE_RESET=true as a staged secret; start.mainnet.ts
#                     prepends a wipe step that runs before PGlite starts.
#                     You MUST unset PGLITE_RESET after the deploy succeeds
#                     or every subsequent boot will re-wipe (script prints
#                     the exact command).

set -euo pipefail

# --- Flag parsing -------------------------------------------------------
RESET="false"
while (( $# > 0 )); do
  case "$1" in
    --reset) RESET="true" ;;
    -h|--help)
      sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "error: unknown flag: $1" >&2
      echo "       run with --help for usage" >&2
      exit 1
      ;;
  esac
  shift
done

APP_NAME="${FLY_APP_NAME:-canvas-node}"
REGION="${FLY_REGION:-iad}"
BATCHER_VOLUME="batcher_data"
BATCHER_SIZE_GB="${BATCHER_SIZE_GB:-1}"
CONFIG_FILE="fly.node.pglite.toml"
# start.mainnet.ts gates launchPglite() on PGLITE=true (set in [env] of
# fly.node.pglite.toml), so the same orchestrator file serves both modes.
ORCHESTRATOR_FILE="start.mainnet.ts"

# ---------------------------------------------------------------------------
# Sanity checks
# ---------------------------------------------------------------------------
command -v fly >/dev/null 2>&1 || {
  echo "error: flyctl not installed (https://fly.io/docs/flyctl/install/)" >&2
  exit 1
}
[[ -f "$CONFIG_FILE" ]] || {
  echo "error: $CONFIG_FILE not found — run from repo root" >&2
  exit 1
}
[[ -f "$ORCHESTRATOR_FILE" ]] || {
  echo "error: $ORCHESTRATOR_FILE not found — run from repo root" >&2
  exit 1
}

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
if ! fly apps list 2>/dev/null | awk 'NR>1 {print $1}' | grep -qx "$APP_NAME"; then
  echo ">> creating app $APP_NAME"
  fly apps create "$APP_NAME"
else
  echo ">> app $APP_NAME already exists"
fi

# ---------------------------------------------------------------------------
# Volumes
#
# Fly volumes are per-app and not deduped by name — running `volumes create`
# twice produces two volumes with the same name, which then both try to
# attach. Check before creating.
# ---------------------------------------------------------------------------
have_volume() {
  # `fly volumes list` renders a box-drawing table where `│` is the column
  # separator. Splitting on it puts NAME in $3 (after ID, STATE). We strip
  # surrounding whitespace before comparing. The default whitespace FS
  # treats `│` as its own field and shifts everything by one — that's why
  # an earlier version of this check silently always returned false and
  # let `fly volumes create` spawn a new volume on every deploy.
  fly volumes list -a "$APP_NAME" 2>/dev/null \
    | awk -F'│' -v v="$1" '
        NR > 1 {
          name = $3
          gsub(/^[[:space:]]+|[[:space:]]+$/, "", name)
          if (name == v) found = 1
        }
        END { exit !found }
      '
}

ensure_volume() {
  local name="$1"
  local size_gb="$2"
  if have_volume "$name"; then
    echo ">> volume $name already exists"
  else
    echo ">> creating volume $name (${size_gb}GB, $REGION)"
    fly volumes create "$name" \
      --size "$size_gb" \
      --region "$REGION" \
      -a "$APP_NAME" \
      --yes
  fi
}

ensure_volume "$BATCHER_VOLUME" "$BATCHER_SIZE_GB"

# ---------------------------------------------------------------------------
# Secrets
#
# Fly secrets override [env] in fly.toml — so if the previous Neon deploy
# left DB_HOST / DB_PW / PGSSLMODE set as secrets, those would silently
# beat the localhost defaults in fly.node.pglite.toml and the app would
# try (and fail) to reach Neon. Clear them.
# ---------------------------------------------------------------------------
SECRET_LIST=$(fly secrets list -a "$APP_NAME" 2>/dev/null | awk 'NR>1 {print $1}' || true)

NEON_OVERRIDES=(DB_HOST DB_PORT DB_NAME DB_USER DB_PW PGSSLMODE PGCONNECT_TIMEOUT)
TO_UNSET=()
for s in "${NEON_OVERRIDES[@]}"; do
  if grep -qx "$s" <<<"$SECRET_LIST"; then
    TO_UNSET+=("$s")
  fi
done
if (( ${#TO_UNSET[@]} > 0 )); then
  echo ">> unsetting Neon-mode secrets so [env] in $CONFIG_FILE wins:"
  echo "   ${TO_UNSET[*]}"
  # --stage so the unsets get bundled with the deploy below into a single
  # machine restart instead of triggering an immediate roll on the old image.
  fly secrets unset -a "$APP_NAME" --stage "${TO_UNSET[@]}"
fi

# --- Optional one-shot PGlite reset ------------------------------------
# Stage PGLITE_RESET=true so the next boot wipes the data dir. start.mainnet.ts
# prepends a wipe process gated on this env. Staged secrets apply with the
# deploy below, no extra restart.
# When resetting, we also fetch the latest chain tip from Base RPC and stage
# START_BLOCKHEIGHT to ensure syncing starts from the current tip.
if [[ "$RESET" == "true" ]]; then
  echo ">> --reset given: staging PGLITE_RESET=true (will wipe pgdata on boot)"
  
  echo ">> Fetching latest block height from Base RPC..."
  HEX_TIP=$(curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    https://mainnet.base.org | jq -r '.result' || true)

  if [[ "$HEX_TIP" =~ ^0x[0-9a-fA-F]+$ ]]; then
    TIP=$(printf "%d" "$HEX_TIP")
    echo ">> Found Base tip: $TIP"
    echo ">> Staging PGLITE_RESET=true and START_BLOCKHEIGHT=$TIP"
    fly secrets set -a "$APP_NAME" --stage PGLITE_RESET=true START_BLOCKHEIGHT="$TIP"
    SECRET_LIST+=$'\nSTART_BLOCKHEIGHT'
  else
    echo "warning: failed to fetch chain tip from Base RPC, only staging PGLITE_RESET=true." >&2
    fly secrets set -a "$APP_NAME" --stage PGLITE_RESET=true
  fi
fi

# Required runtime secrets (set by humans, not by this script). We warn but
# don't refuse to deploy — config.mainnet.ts will fail fast at boot with a
# clear message if any are missing.
REQUIRED_SECRETS=(
  EVM_RPC_URL
  CANVAS_GAME_ADDRESS
  START_BLOCKHEIGHT
  EVM_PRIVATE_KEY
  CORS_ORIGIN
)
MISSING=()
for s in "${REQUIRED_SECRETS[@]}"; do
  grep -qx "$s" <<<"$SECRET_LIST" || MISSING+=("$s")
done
if (( ${#MISSING[@]} > 0 )); then
  echo ">> WARNING: missing required secrets on $APP_NAME:"
  for s in "${MISSING[@]}"; do
    echo "     - $s"
  done
  echo "   set with: fly secrets set -a $APP_NAME <NAME>=<value> ..."
fi

# ---------------------------------------------------------------------------
# Deploy
# ---------------------------------------------------------------------------
echo ">> deploying $APP_NAME with $CONFIG_FILE"
fly deploy --config "$CONFIG_FILE" -a "$APP_NAME"

echo ""
echo ">> done."
echo "   logs:     fly logs -a $APP_NAME"
echo "   status:   fly status -a $APP_NAME"
echo "   ssh:      fly ssh console -a $APP_NAME"
echo "   pg files: fly ssh console -a $APP_NAME -C 'ls -la /app/batcher-data/pgdata'"

if [[ "$RESET" == "true" ]]; then
  echo ""
  echo ">> ⚠  PGLITE_RESET=true is now set as a secret. Every machine"
  echo ">>    restart will RE-WIPE the database until you unset it."
  echo ">>    Once you've confirmed the wipe deploy is healthy, run:"
  echo ">>      fly secrets unset -a $APP_NAME PGLITE_RESET"
fi
