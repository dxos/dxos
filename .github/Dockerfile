FROM ubuntu:24.04

# Install dependencies
RUN apt-get update \
  && apt-get install -y \
    build-essential \
    ca-certificates \
    curl \
    git-lfs \
    gpg \
    jq \
    libenchant-2-2 \
    libpng++-dev \
    libxtst-dev \
    python3 \
    sudo \
    unzip \
    xz-utils

# Install Node.js from official binary tarball
# NOTE: Keep node and pnpm in sync with .prototools.
#  These exist only to bootstrap CI: the setup action runs `pnpm install` before any moon task, so they are
#  used until moon's toolchain cache exists, and everything after that uses the .prototools versions. bun is
#  deliberately absent — moon installs it, and a copy here would shadow the pinned one.
ARG NODE_VERSION=24.11.1
RUN ARCH=$(uname -m) \
  && if [ "$ARCH" = "x86_64" ]; then ARCH="x64"; elif [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; else echo "Unsupported architecture: $ARCH"; exit 1; fi \
  && curl -fsSL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-$ARCH.tar.xz -o /tmp/node.tar.xz \
  && mkdir -p /opt/nodejs \
  && tar -xf /tmp/node.tar.xz -C /opt/nodejs --strip-components=1 \
  && rm /tmp/node.tar.xz \
  && ln -s /opt/nodejs/bin/* /usr/local/bin/

# Ensure npm global installs go to /usr/local and are in PATH.
ENV NPM_CONFIG_PREFIX=/usr/local
ENV PATH=$PATH:/usr/local/bin

# Install pnpm.
RUN npm install -g pnpm@10.28.0 \
  # Install playwright native dependencies.
  # NOTE: Keep playwright version in sync with the one in package.json.
  # https://playwright.dev/docs/docker#build-your-own-image
  && npx -y playwright@1.57.0 install-deps \
  # Cleanup apt cache.
  && rm -rf /var/lib/apt/lists/*

# Create a user with a fixed UID:GID and add to sudo group.
RUN groupadd -g 1001 runner && \
    useradd -m -u 1001 -g 1001 -s /bin/bash runner && \
    usermod -aG sudo runner && \
    echo "runner ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Give the user ownership of expected directories:
# /__w: Workspace (repo checkout)
# /__t: Tool cache (rarely used directly)
# /__e: Actions cache (rarely used directly)
# /github: GitHub internals (env, path, workflow)
RUN mkdir -p /__w /__t /__e /github && \
    chown -R runner:runner /__w /__t /__e /github

# Switch to the user.
USER runner
