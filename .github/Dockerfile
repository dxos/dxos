FROM ubuntu:24.04

# System packages, Node, pnpm, Playwright's native dependencies and browsers: `ci-packages.sh`.
ARG NODE_VERSION=24.11.1
# A fixed path outside $HOME, which GitHub overrides to /github/home in container jobs.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY ci-packages.sh /tmp/ci-packages.sh
RUN NODE_VERSION=${NODE_VERSION} bash /tmp/ci-packages.sh \
  && rm -rf /var/lib/apt/lists/* /tmp/ci-packages.sh

# Ensure npm global installs go to /usr/local and are in PATH.
ENV NPM_CONFIG_PREFIX=/usr/local
ENV PATH=$PATH:/usr/local/bin

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
# /ms-playwright: so `playwright install` can add a browser revision after a catalog bump outpaces the image.
RUN mkdir -p /__w /__t /__e /github && \
    chown -R runner:runner /__w /__t /__e /github /ms-playwright

# Switch to the user.
USER runner
