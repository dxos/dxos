FROM node:18-slim AS monorepo
LABEL maintainer="DXOS Docker Maintainers <info@dxos.org>"

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NX_DAEMON=false
ENV NODE_OPTIONS="--max_old_space_size=12288"

RUN npm install -g pnpm@8.15.2
RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y python3 make g++ libxtst-dev libpng++-dev libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

COPY . /app
WORKDIR /app

ARG DX_ENVIRONMENT
ARG DX_IPDATA_API_KEY
ARG DX_SENTRY_DESTINATION
ARG DX_TELEMETRY_API_KEY
ARG DX_DATADOG_API_KEY
ARG DX_DATADOG_APP_KEY
ARG DX_DATADOG_PROXY
ARG DX_COMMIT_HASH
ARG DX_VERSION

ENV DX_ENVIRONMENT=$DX_ENVIRONMENT
ENV DX_VERSION=$DX_VERSION
ENV SENTRY_RELEASE=$DX_VERSION
# NOTE: @dxos/cli is the only thing consuming these at build time, the apps all consume them at bundle.
ENV DX_IPDATA_API_KEY=$DX_IPDATA_API_KEY
ENV DX_SENTRY_DESTINATION=$DX_SENTRY_DESTINATION
ENV DX_TELEMETRY_API_KEY=$DX_TELEMETRY_API_KEY
ENV DX_DATADOG_API_KEY=$DX_DATADOG_API_KEY
ENV DX_DATADOG_APP_KEY=$DX_DATADOG_APP_KEY
ENV DX_DATADOG_PROXY=$DX_DATADOG_PROXY

ENV DX_BUILD_ROOT_DIR=/app
ENV DX_COMMIT_HASH=$DX_COMMIT_HASH

RUN pnpm install --frozen-lockfile
ENV NODE_ENV=production
RUN pnpm build


# Agent
RUN pnpm run -C packages/devtools/cli prepublishOnly
RUN pnpm deploy --filter=@dxos/cli --prod /prod/cli

# Composer
ARG COMPOSER_DX_SENTRY_DESTINATION
ARG COMPOSER_DX_TELEMETRY_API_KEY

ENV DX_SENTRY_DESTINATION=$COMPOSER_DX_SENTRY_DESTINATION
ENV DX_TELEMETRY_API_KEY=$COMPOSER_DX_TELEMETRY_API_KEY

RUN pnpm nx bundle composer-app

#########
# Agent #
#########
FROM node:18-slim AS agent
COPY --from=monorepo /prod/cli /prod/cli
WORKDIR /prod/cli
ENV PATH="/prod/cli/bin:$PATH"
ENTRYPOINT ["/prod/cli/bin/agent_entrypoint"]
CMD ["dx", "agent", "start", "-f"]

############
# Composer #
############

# NOTE: experimental.
FROM nginx AS composer-app
COPY --from=monorepo --chmod=755 /app/packages/apps/composer-app/out/composer /usr/share/nginx/html
COPY --from=monorepo /app/packages/apps/composer-app/conf/nginx/default.conf /etc/nginx/conf.d/default.conf
