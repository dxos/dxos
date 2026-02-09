# DXOS Repository Guide

Instructions and documentation for developer workflows in this DXOS repository.

## Prerequisites

- Native libraries:

```bash
brew install cairo giflib git-lfs jpeg libpng librsvg pango pkg-config python-setuptools git unzip gzip xz
```

- Install [proto](https://moonrepo.dev/docs/proto/install):

```bash
bash <(curl -fsSL https://moonrepo.dev/install/proto.sh)
```

Setup proto for shell activation:

```bash
eval "$(proto activate zsh --config-mode all)"
```

## Monorepo workspace

This monorepo repository is built with [`pnpm`](https://pnpm.io) and [`moon`](https://moonrepo.dev), with [`release-please`](https://github.com/googleapis/release-please) for release automation.

Setup:

```bash
proto install
```

To update moon:

```bash
proto install moon latest
proto pin moon latest
```

Install at the repo root:

```bash
pnpm i
```

Build everything:

```bash
pnpm build
```

> Don't forget to install and build when switching branches

Run all unit tests:

```bash
pnpm test
```

Recompile any package within the monorepo when changes are detected:

```bash
pnpm watch
```

> Run watch alongside a vite dev server to get monorepo-wide hot module reloading

## Run commands

Examples of ways to start up different workloads in dev mode:
| Command | Description |
| :-- | :-- |
| `moon run tasks-app:serve` | Runs the `tasks-app` in dev mode |
| `moon run composer-app:serve` | Runs the `composer-app` in dev mode |
| `moon run docs:serve` | Runs the `docs` astro app in dev mode |

## Test commands

Examples of ways to run different test workloads:
| Command | Description |
| :-- | :-- |
| `moon run client-services:test` | Runs the unit tests for `client-services` |
| `moon run echo-db:test-watch` | Runs the unit tests for `echo-db` whenever any of the source files in the package change |
| `moon run todomvc:e2e` | Runs the playwright tests for `halo-app` |
| `moon run todomvc --debug` | Runs tests with playwright inspector |

## Storybooks

The following command generates storybooks across the individual packages:

```bash
moon run storybook:serve
```

### Playwright

Playwright tests are written using these [guidelines](./tools/executors/test/PLAYWRIGHT.md).

## Adding new dependencies

All dependency versions are managed in the catalog. To add a new dependency, use the following command:

```bash
pnpm add --filter "<project>" --save-catalog "<package>"
```

See the [pnpm catalog docs](https://pnpm.io/catalogs) for more information.

> TODO: Introduce a separate catalog for peer dependencies.

## Updating dependencies

Use `npm-check-updates` to update dependencies from the root directory. For example:

```bash
npx npm-check-updates -u --deep "@codemirror/*"
pnpm i
```

NOTE: Do not use `pnpm up` since it will update more than the targeted dependencies.

## Folders

| Folder                  | Description                                                                                    |
| :---------------------- | :--------------------------------------------------------------------------------------------- |
| `packages`              | most of the sub packages of the platform                                                       |
| `packages/apps`         | all the applications, samples, app templates, component kits and patterns                      |
| `packages/sdk`          | API surfaces such as the main `@dxos/client` and `@dxos/react-client` packages                 |
| `packages/core`         | main packages that support the `sdk`                                                           |
| `packages/devtools`     | `dx` CLI, `inspector` tool, and other tooling apps                                             |
| `packages/gravity`      | a load and scenario testing framework used to exercise and harden DXOS components              |
| `packages/bots`         | DXOS bots: headless agents which work with ECHO                                                |
| `packages/experimental` | experimental things                                                                            |
| `packages/deprecated`   | deprecated things                                                                              |
| `tools`                 | workflow, automation, tooling code that supports the repo, but isn't part of the main platform |
| `scripts`               | shell scripts for automation                                                                   |
| `patches`               | pnpm applied patches via `pnpm patch`                                                          |
| `docs`                  | a `astro` docs site behind `docs.dxos.org`                                                     |

## Logging

Logging should use the `@dxos/log` package, which can be controlled using using `runtime.client.log` in `@dxos/config`.

For local development, the log filter can be set using the [`LOG_FILTER` environment variable, e.g.](./packages/apps/composer-app/dx-env.yml).

For hosted apps, it can be set in the browser using `localStorage.dxlog`, e.g. `localStorage.dxlog='{ "filter": "messaging:debug,info"}'`.

The filter consists of a series of filename pattern/level tuples separated by commas. For example, `echo:debug,info` will set the log level to `debug` for any filename matching "echo", and `info` for everything else.

## Branches

- In general, features are developed on feature branches starting with the author's nickname e.g.: `alice/some-feature`.
- Features merge to `main` via PRs and checks like `pnpm test` and `pnpm lint` must pass.
- PRs have to be [titled conventionally](https://www.conventionalcommits.org/en/v1.0.0/).
- The default branch for development is `main`, if you are contributing this is where you make PRs to.
- Feature branches within the repo are prefixed with the contributors username.
- External contributors may contribute by forking the repo and sending PRs from their fork.
- All feature branches are squashed when being merged to `main`.
- When preparing a new release, a release candidate is cut from `main` using a Github action, these branches are prefixed with `rc-`.
- On `rc-` branches Release Please runs and calculates what the next version should be.
- Any further bug fixes merged to the `rc-` branch will also be pushed to `main`.
- Once the Release Please PR is merged and the release is tagged, the `rc-` branch is merged into `main` and `production` before the branch is deleted.
- The workflow for hotfixes is identical except it starts by branching from `production` and the branch is prefixed with `hotfix-`.
- The current workflow for `staging` is force pushing any branch there as needed, the expectation is that this would generally be only be done from `rc-` or `hotfix-` branches.

## Publishing

- All merges to `main` automatically publish apps to dev environment and publish npm packages under the `main` tag.
- All merges to `staging` automatically publish apps to staging environment and publish npm packages under the `next` tag.
- All merges to `production` automatically publish apps to production environment and publish npm packages under the `latest` tag.

### Apps

The script used to publish apps to a KUBE environment is [here](https://github.com/dxos/dxos/blob/main/.github/workflows/scripts/publish-apps.sh).
In order to include a new app in the publish loop it needs to be added to the `APPS` list in this script.

## Dependencies

Packages can be locked to a particular version as required by updating `pnpm.overrides` in `package.json`.

Examples:

- `"@types/node": "22.5.5"` (required by Cloudflare Workers).

## CI

See [CI docs](./.github/workflows/README.md).

## Branch Diagram

![release flow diagram](./docs/content/design/diagrams/release-flow.drawio.svg)

Based on [this post from nvie.com](https://nvie.com/posts/a-successful-git-branching-model/).

## Workflow:

- merge release candidates and hot fixes w/ `git merge --no-ff`
- merge feature branches by squashing
- staging is force pushed to from other branches
- main/production maintain history

| branch       | purpose                                                                               |
| :----------- | :------------------------------------------------------------------------------------ |
| `main`       | the only feature integration branch                                                   |
| `production` | reflects what code is in production (npm, docs sites, apps, etc) e.g. `docs.dxos.org` |
| `staging`    | reflects what code is in staging `docs.staging.dxos.org`                              |
| `rc-*`       | release branches created from main and to merge with `production` or `stating`        |
| `hotfix-*`   | a hotfix branch created from `production` and destined for `production`               |

## Patching third-party repos

1. Clone and fork the third-party repo then maked edits and build

```bash
cd ~/Code/Effect-TS
git clone https://github.com/Effect-TS/effect.git
git remote add upstream https://github.com/Effect-TS/effect.git
pnpm build
pnpm ellint
```

2. Create and commit a patch.

```bash
cd ~/Code/dxos/dxos
pnpm patch @effect/ai-anthropic
cp -r ~/Code/Effect-TS/effect/packages/ai/anthropic/dist/* ~/Code/dxos/dxos/node_modules/.pnpm_patches/@effect/ai-anthropic@0.16.1/
pnpm patch-commit
```

This will create a patch file in the `patches` directory and update the `patchDependencies` of the root `package.json`.

3. Submit a PR to the third-party repo.

Create a changeset, command and push.

```bash
pnpm changeset
```

Commit and push the changes to the third-party repo.

## Formatting and linting

Formatting is done by `prettier` and linting by `eslint`. Passing lint is required to merge to `main`.

Run `pnpm lint` to conform the entire repository with (equivalent of `lint --fix`).

Run `pnpm lint:changed` to lint only what you've been working on using `pnpm changed-packages`.

### ESLint errors in vscode

To make all eslint errors look yellow in `vscode`, open your user preferences (not workspace preferences) and add this to the JSON:

```json
  "eslint.rules.customizations": [{ "rule": "*", "severity": "warn" }]
```

Alternatively to autofix all lint errors on save add the following config:

```json
  "editor.codeActionsOnSave": {"source.fixAll": true}
```

## Mobile development

Modern browsers treat `localhost` as a secure context, allowing secure apis such a `SubtleCrypto` to be used in an application served from `localhost`, however sometimes this is not enough.
For example, you may want other devices on your local network to be able to access your dev server (particularly useful when debugging issues on mobile devices).
In this case you would be accessing the app via the ip address of your host machine rather than `localhost`.
IP addresses are not a secure context unless they are served with https and a certificate. The apps in this repo are setup to serve the dev server with https when `HTTPS=true`.
What follows are instructions on how to setup the certificate for your devices to make this work as expected:

1.  Install mkcert following these [instructions](https://github.com/FiloSottile/mkcert#installation).
2.  Run `mkcert -install` to create a new local CA.
3.  Generate a cert by running `mkcert localhost $(ipconfig getifaddr en1)`.
4.  In order for the certificate to be recognized by a mobile device the root CA must be installed on the device.
    Follow these [instructions](https://github.com/FiloSottile/mkcert#mobile-devices) to enable this.
5.  Rename the cert `cert.pem` and the key `key.pem` (all `.pem` files are in `.gitignore`).
6.  The vite config uses a path relative from the CWD to load the key files and each app is setup with the following config:
7.  Update `dx-local.yml` to update the vault URL to include `https`.

<!---->

    {
      server: {
        https: process.env.HTTPS === 'true' ? {
          key: '../../../key.pem',
          cert: '../../../cert.pem'
        } : false,
        ...
      },
      ...
    }

Given this, the recommended setup is to run `serve` from the repo root and keep the `cert.pem` and `key.pem` files there.
Alternatively, a copy of them could be kept in each app directory if `serve` is run from the app directory as well.

## Service Workers

Observations of service worker behavior related to using apps w/ DXOS vault:

| Page load method                                                                     | In IFrame | Service worker behavior                                                                                 |
| :----------------------------------------------------------------------------------- | :-------- | :------------------------------------------------------------------------------------------------------ |
| New tab                                                                              | N/A       | New version waiting for activation is activated                                                         |
| Reload                                                                               | No        | New version is not activated (https://web.dev/service-worker-lifecycle/#waiting)                        |
| Reload                                                                               | Yes       | New version waiting for activation is activated (Chrome/Firefox), new version is not activated (Webkit) |
| [Hard reload](https://web.dev/service-worker-lifecycle/#shift-reload)                | N/A       | New version waiting for activation is activated                                                         |
| [Update & reload](https://vite-plugin-pwa.netlify.app/frameworks/#prompt-for-update) | N/A       | New version waiting for activation is activated                                                         |

Recommended reading for better understanding the service worker lifecycle: https://web.dev/service-worker-lifecycle.

### Vite

The easiest way to setup a PWA with Vite is to use this plugin https://vite-plugin-pwa.netlify.app/.

At present the recommendation would be to avoid the [`autoUpdate` strategy](https://vite-plugin-pwa.netlify.app/guide/auto-update.html) as it does not provide any predictability to users for when the app will update.

NOTE: the [prompt for update strategy](https://vite-plugin-pwa.netlify.app/guide/prompt-for-update.html) can be used without actually providing prompts and the app will update along the lines of the table above.
This is currently how the HALO vault's service worker is setup (though it will likely evolve later to [handle migrations](https://web.dev/service-worker-lifecycle/#activate-2)).

### Detecting unused deps

```bash
pnpm -r --filter "./packages/core/**" --filter "\!@dxos/automerge" exec depcheck --quiet --skip-missing=true --oneline  --ignores=@dxos/node-std,@bufbuild/protoc-gen-es
```
