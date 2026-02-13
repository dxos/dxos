# Source Maps

## Decision

PostHog source maps are enabled for composer-app (and any other `*-app` that configures a PostHog project ID). Minified production stack traces are resolved to readable source locations via PostHog error tracking.

## Where maps are stored

- **PostHog:** Source maps are uploaded during the publish workflow ([publish-apps.sh](.github/workflows/scripts/publish-apps.sh)) so PostHog can unminify stack traces.
- **Deployed app:** Source maps are also deployed with the app (open source); they are not stripped from the build.

## How to resolve a stack

Use the PostHog error tracking UI. Errors are associated with releases (release name + version). Stack traces are unminified when the matching source maps have been uploaded for that release.

- [Error tracking symbol sets](https://app.posthog.com/settings/project-error-tracking#error-tracking-symbol-sets) – confirm uploads per project.

## Secrets required

Configure these GitHub secrets for source map upload in CI:

- **POSTHOG_CLI_API_KEY** – Personal API key with `error-tracking:write` and `organization read` scopes ([API key settings](https://app.posthog.com/settings/user-api-keys#variables)).
- **COMPOSER_APP_DEV_POSTHOG_PROJECT_ID** – PostHog project ID for dev/main.
- **COMPOSER_APP_STAGING_POSTHOG_PROJECT_ID** – PostHog project ID for staging.
- **COMPOSER_APP_PROD_POSTHOG_PROJECT_ID** – PostHog project ID for production.

Project IDs are per-app, per-environment. Get project ID from [PostHog project settings](https://app.posthog.com/settings/project#variables).

For EU cloud, set `POSTHOG_CLI_HOST` (e.g. `https://eu.posthog.com`) in the workflow env or pass `--host` to the CLI.

## Retention and PII

PostHog's standard [privacy and data retention](https://posthog.com/docs/privacy) policies apply. Source maps contain source code paths and structure; they do not contain runtime data.
