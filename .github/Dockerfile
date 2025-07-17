ARG NODE_VERSION=20.12.1

FROM node:${NODE_VERSION}

RUN apt-get update \
  # Install native dependencies.
  && apt-get install -y libxtst-dev libpng++-dev libenchant-2-2 git-lfs \
  # Install playwright native dependencies.
  # NOTE: Keep playwright version in sync with the one in package.json.
  # https://playwright.dev/docs/docker#build-your-own-image
  && npx -y playwright@1.46.0 install --with-deps \
  # Cleanup apt cache.
  && rm -rf /var/lib/apt/lists/* \
  # Install pnpm.
  && npm install -g pnpm@10.13.1

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
