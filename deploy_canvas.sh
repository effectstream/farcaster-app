#!/usr/bin/env bash
# deploy_canvas.sh — Farcaster Canvas mainnet deploy on Fly.io.
#
# Thin wrapper that bundles canvas-specific config (deployed contract
# address, sync start block, chain URI) with the PGlite-on-volume Fly
# deploy in deploy_pglite.sh.
#
# Public values are hardcoded inline (chain ID, contract address, start
# block — all on Basescan). Sensitive values (EVM_RPC_URL with provider
# API key, EVM_PRIVATE_KEY for the batcher hot wallet, CORS_ORIGIN for
# the production Mini App domain) MUST come from the environment or a
# local .env file (which is gitignored). The script refuses to deploy
# if any are missing.
#
# Usage:
#   ./deploy_canvas.sh            # normal deploy
#   ./deploy_canvas.sh --reset    # one-shot PGlite wipe (passes through)
#
# Required (env or .env):
#   EVM_RPC_URL        Base RPC endpoint, typically containing an
#                      Alchemy/Infura/QuickNode API key.
#   EVM_PRIVATE_KEY    Batcher hot wallet, must hold Base ETH for gas.
#   CORS_ORIGIN        Production Mini App origin(s), comma-separated.

set -euo pipefail

# ---------------------------------------------------------------------------
# Flag passthrough — we don't parse flags ourselves; deploy_pglite.sh
# handles --reset / --help / etc. Pass them through unchanged.
# ---------------------------------------------------------------------------
PASSTHROUGH_ARGS=("$@")

# ---------------------------------------------------------------------------
# Locate ourselves so the script works regardless of cwd.
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd "$SCRIPT_DIR"

APP_NAME="${FLY_APP_NAME:-canvas-node}"

command -v fly >/dev/null 2>&1 || {
  echo "error: flyctl not installed (https://fly.io/docs/flyctl/install/)" >&2
  exit 1
}
[[ -x ./deploy_pglite.sh ]] || {
  echo "error: ./deploy_pglite.sh not found or not executable" >&2
  exit 1
}

# ---------------------------------------------------------------------------
# Canvas public config — safe to commit.
#
# CHAIN_ID, CHAIN_NAME, BATCHER_PORT, EFFECTSTREAM_API_PORT, DB_*, PGSSLMODE
# etc. already live in fly.node.pglite.toml's [env] — no point duplicating
# them as secrets. We only stage values that aren't in [env].
# ---------------------------------------------------------------------------
PUBLIC_SECRETS=(
  # CanvasGame deployment on Base mainnet — visible on basescan.org.
  CANVAS_GAME_ADDRESS=0x3C4bF84da537ec08Fc9C326b8Ed04Cf695b76558
  # Deployment block of CanvasGame. EVM syncer starts here. Public chain data.
  START_BLOCKHEIGHT=46604300
  # Public Base RPC. Falls back here if EVM_RPC_URL ever loses its provider
  # endpoint — also used as a chain identity hint inside the runtime.
  CHAIN_URI=https://mainnet.base.org
)

# ---------------------------------------------------------------------------
# Sensitive config — must be in env or .env. We pull from .env if present
# (gitignored), but never echo values. Failing the check before any deploy
# step happens means a misconfigured run can't silently push wrong creds.
# ---------------------------------------------------------------------------
REQUIRED_SENSITIVE=(
  EVM_RPC_URL
  EVM_PRIVATE_KEY
  CORS_ORIGIN
)

# Source .env with auto-export so REQUIRED_SENSITIVE keys (and only those)
# get pulled into our environment if not already set. We don't blindly
# export everything in .env — that would risk leaking stale Neon DB_HOST
# values into the deploy.
if [[ -f .env ]]; then
  # Read in a subshell to avoid polluting the parent with unrelated vars.
  while IFS='=' read -r key val; do
    # Skip comments / blank lines.
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$key" ]] && continue
    # Strip surrounding quotes from value if present.
    val="${val%\"}"
    val="${val#\"}"
    val="${val%\'}"
    val="${val#\'}"
    for want in "${REQUIRED_SENSITIVE[@]}"; do
      if [[ "$key" == "$want" && -z "${!key:-}" ]]; then
        export "$key=$val"
      fi
    done
  done < .env
fi

MISSING=()
for k in "${REQUIRED_SENSITIVE[@]}"; do
  [[ -z "${!k:-}" ]] && MISSING+=("$k")
done
if (( ${#MISSING[@]} > 0 )); then
  echo "error: missing required sensitive env vars (set in shell or .env):" >&2
  for k in "${MISSING[@]}"; do echo "         - $k" >&2; done
  echo "" >&2
  echo "  example .env entries (gitignored):" >&2
  echo "    EVM_RPC_URL=https://base-mainnet.g.alchemy.com/v2/<your-key>" >&2
  echo "    EVM_PRIVATE_KEY=0x<batcher-wallet-privkey>" >&2
  echo "    CORS_ORIGIN=https://canvas.your-domain.com" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Stage everything on Fly. `secrets set --stage` bundles changes for the
# next deploy without triggering its own restart — the deploy below picks
# them up in a single machine roll.
# ---------------------------------------------------------------------------
echo ">> staging canvas public config on $APP_NAME"
fly secrets set -a "$APP_NAME" --stage "${PUBLIC_SECRETS[@]}"

# Build the kv array for sensitive secrets. Values stay in process memory;
# we never echo them. flyctl only prints the keys it set, not the values.
SENSITIVE_KV=()
for k in "${REQUIRED_SENSITIVE[@]}"; do
  SENSITIVE_KV+=("$k=${!k}")
done
echo ">> staging canvas sensitive secrets on $APP_NAME (${REQUIRED_SENSITIVE[*]})"
fly secrets set -a "$APP_NAME" --stage "${SENSITIVE_KV[@]}"

# ---------------------------------------------------------------------------
# Hand off to the PGlite Fly deploy. All flags (e.g. --reset) pass through.
# `exec` so signals (Ctrl+C) reach the deploy cleanly.
# ---------------------------------------------------------------------------
echo ">> handing off to ./deploy_pglite.sh ${PASSTHROUGH_ARGS[*]:-}"
exec ./deploy_pglite.sh "${PASSTHROUGH_ARGS[@]}"
