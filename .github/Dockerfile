FROM ubuntu:24.04

# Install dependencies
RUN apt-get update \
  && apt-get install -y \
    curl \
    xz-utils \
    ca-certificates \
    libxtst-dev \
    libpng++-dev \
    libenchant-2-2 \
    git-lfs \
    jq \
  && rm -rf /var/lib/apt/lists/*

# Install Node.js from official binary tarball
ARG NODE_VERSION=20.12.1
RUN ARCH=$(uname -m) \
  && if [ "$ARCH" = "x86_64" ]; then ARCH="x64"; elif [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; else echo "Unsupported architecture: $ARCH"; exit 1; fi \
  && curl -fsSL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-$ARCH.tar.xz -o /tmp/node.tar.xz \
  && mkdir -p /opt/nodejs \
  && tar -xf /tmp/node.tar.xz -C /opt/nodejs --strip-components=1 \
  && rm /tmp/node.tar.xz \
  && ln -s /opt/nodejs/bin/* /usr/local/bin/

# Install pnpm
RUN npm install -g pnpm@10.13.1 \
  # Install playwright native dependencies.
  # NOTE: Keep playwright version in sync with the one in package.json.
  # https://playwright.dev/docs/docker#build-your-own-image
  && npx -y playwright@1.54.1 install-deps

# TODO(wittjosiah): Allow runner to use sudo.
# Create a user with a fixed UID:GID.
RUN groupadd -g 1001 runner && \
    useradd -m -u 1001 -g 1001 -s /bin/bash runner

# Give the user ownership of expected directories:
# /__w: Workspace (repo checkout)
# /__t: Tool cache (rarely used directly)
# /__e: Actions cache (rarely used directly)
# /github: GitHub internals (env, path, workflow)
RUN mkdir -p /__w /__t /__e /github && \
    chown -R runner:runner /__w /__t /__e /github

# Switch to the user.
USER runner
