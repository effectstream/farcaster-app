FROM oven/bun:1

# ----------------------------- System deps -----------------------------
RUN apt-get update && apt-get install -y \
    curl lsof iproute2 unzip procps git xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Node.js (postinstall scripts + Hardhat)
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# ----------------------------- Foundry (anvil) -------------------------
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then FOUNDRY_ARCH="arm64"; else FOUNDRY_ARCH="amd64"; fi && \
    curl -L "https://github.com/foundry-rs/foundry/releases/download/v1.3.0-rc1/foundry_v1.3.0-rc1_alpine_${FOUNDRY_ARCH}.tar.gz" \
        -o foundry.tar.gz && \
    tar -xzf foundry.tar.gz && \
    mv anvil cast forge /usr/local/bin/ && \
    rm foundry.tar.gz

# Pre-cache solc wasm so Hardhat doesn't try to download at runtime under Bun.
RUN mkdir -p /root/.cache/hardhat-nodejs/compilers-v3/wasm && \
    curl -fsSL "https://binaries.soliditylang.org/wasm/list.json" \
        -o /root/.cache/hardhat-nodejs/compilers-v3/wasm/list.json && \
    curl -fsSL "https://binaries.soliditylang.org/wasm/soljson-v0.8.30+commit.73712a01.js" \
        -o /root/.cache/hardhat-nodejs/compilers-v3/wasm/soljson-v0.8.30+commit.73712a01.js

# ----------------------------- App ------------------------------------
WORKDIR /app
COPY . .

RUN bun install

# Workaround: Bun on Linux doesn't create workspace symlinks in node_modules/.
RUN bun -e " \
  const fs = require('fs'); const path = require('path'); \
  const pkg = JSON.parse(fs.readFileSync('package.json','utf8')); \
  for (const pattern of pkg.workspaces || []) { \
    const glob = new Bun.Glob(pattern); \
    for (const dir of glob.scanSync({onlyFiles:false})) { \
      const p = path.join(dir,'package.json'); \
      if (!fs.existsSync(p)) continue; \
      const wp = JSON.parse(fs.readFileSync(p,'utf8')); \
      if (!wp.name) continue; \
      const [scope,name] = wp.name.startsWith('@') ? wp.name.split('/') : [null,wp.name]; \
      const target = path.resolve(dir); \
      const linkDir = scope ? path.join('node_modules',scope) : 'node_modules'; \
      fs.mkdirSync(linkDir,{recursive:true}); \
      const link = path.join(linkDir,name); \
      if (!fs.existsSync(link)) fs.symlinkSync(target,link); \
    } \
  }"

# Compile contracts and generate the contract-addresses mod.ts.
RUN bun run build:evm
# Build the frontend SPA.
RUN bun run build:frontend

ENV NODE_ENV=development
EXPOSE 9999 3334 5173 10599

CMD ["bunx", "orchestrator", "start", "--config", "start.dev.ts"]
