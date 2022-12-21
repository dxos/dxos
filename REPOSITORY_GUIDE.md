# DXOS Repository Guide

Instructions and documentation for developer workflows in this DXOS repository.

## Prerequisites
- Node v18.x (recommended: [Node Version Manager](https://github.com/nvm-sh/nvm))
## Monorepo workspace
This repository is a [`pnpm`](https://pnpm.io/) and [`nx`](https://nx.dev/) monorepo with [`release-please`](https://github.com/googleapis/release-please) for release automation.

Get `pnpm`
```bash
npm i -g pnpm
```

Install at the repo root:
```
pnpm i
```
Build everything:
```
pnpm build
```

> Don't forget to install and build when switching branches

Run all unit tests
```
pnpm test
```

## Run commands:
Examples of ways to start up different workloads in dev mode:
| Command | Description |
| :-- | :-- |
| `pnpm nx serve halo` | Runs the `halo` app in dev mode |
| `pnpm nx serve-with-halo tasks-app` | Runs the `tasks-app` in dev mode pointing to a `halo-app` in dev mode next to it |
| `pnpm nx serve-with-halo composer-app` | Runs the `composer-app` in dev mode pointing to a `halo-app` in dev mode next to it |
| `pnpm nx serve docs` | Runs the `docs` vuepress app in dev mode |


## Tasks in `nx` targets
Each package has a `project.json` which describes the "targets" or runnable actions/scripts that package can perform. There are also dependencies and caching information expressed such that performing any action will appropriately perform actions it depends on in the right order, cache-reading where possible.

For example, to run a particular app in dev mode, the target (action) is typically called `serve`:
```bash
pnpm nx serve halo-app
```

`nx` executes the target, and is aliased as an npm script `pnpm nx` (to avoid an unexpressed global dependency on an `nx` version). See [`nx run`](https://nx.dev/packages/nx/documents/run) for more syntax.

## Tasks in `scripts`
Packages may also declare scripts in their `package.json` `scripts` field as is traditional for an npm package. This is appropriate when `nx` caching is not suitable or necessary for the task, and when that script does not partake in the `nx` task dependency tree.

## Branches
In general, features are developed on feature branches starting with the author's nickname e.g.: `alice/some-feature`.

Features merge to `main` via PRs and checks like `pnpm test` and `pnpm lint` must pass.

PRs have to be [titled conventionally](https://www.conventionalcommits.org/en/v1.0.0/).

Chages to `main` trigger automatic deploys to the `dev` environment e.g.: `docs.dev.dxos.org`.

Periodically, release branches are created from `main` and merged to the production branches `production` or `staging` which causes deploys to those environments.

| branch       | purpose                                                                               |
| :----------- | :------------------------------------------------------------------------------------ |
| `main`       | the only feature integration branch                                                   |
| `production` | reflects what code is in production (npm, docs sites, apps, etc) e.g. `docs.dxos.org` |
| `staging`    | reflects what code is in staging `docs.staging.dxos.org`                              |
| `release-*`  | release branches created from main and to merge with `production` or `stating`        |
| `hotfix-*`   | a hotfix branch created from `production` and destined for `production`               |

## Folders
| Folder | Description |
| :-- | :-- |
| `packages` | most of the sub packages of the platform |
| `packages/apps` | all the applications, samples, app templates, component kits and patterns |
| `packages/sdk` | API surfaces such as the main `@dxos/client` and `@dxos/react-client` packages |
| `packages/core` | main packages that support the `sdk` |
| `packages/devtools` | `dx` CLI, `inspector` tool, and other tooling apps |
| `packages/gravity` | a load and scenario testing framework used to exercise and harden DXOS components |
| `packages/bots` | DXOS bots: headless agents which work with ECHO |
| `packages/experimental` | experimental things |
| `packages/deprecated` | deprecated things |
| `tools` | workflow, automation, tooling code that supports the repo, but isn't part of the main platform |
| `scripts` | shell scripts for automation |
| `patches` | pnpm applied patches via `npm-patch` |
| `docs` | a `vuepress` docs site behind `docs.dxos.org` |
| `docs/docs` | markdown documentation content |
| `docs/docs/guide` | developer guide as found on `docs.dxos.org/guide` |
| `docs/docs/api` | API documentation generated from JSDoc comments in source |
| `docs/docs/design` | Design documents for future features in research and development |
| `docs/docs/specs` | Descriptions of features currently being built |
## Formatting and linting

Formatting is done by `prettier` and linting by `eslint`. Passing lint is required to merge to `main`.

Run `pnpm lint` to conform the entire repository with (equivalent of `lint --fix`).

Run `pnpm lint:changed` to lint only what you've been working on using `pnpm changed-packages`.

## Tips

### running scripts at the root
Most `nx` incantations assume you're at the root of the repository. They may not work if `cwd` is a nested folder. To force execution from the root while deeper in the repo, you can use `pnpm -w ...` such as `pnpm -w nx build tasks-app`.
### conflicts in `package-lock.yaml`
While rebasing, you can skip dealing with it during the rebase, just be sure to finalize with a `pnpm install` to regenerate the file at the end.
```
git checkout --ours pnpm-lock.yaml && git add pnpm-lock.yaml && git rebase --continue
```
finally
```
pnpm i
``` 
to regenerate the `pnpm-lock.yaml` on the new `HEAD`.