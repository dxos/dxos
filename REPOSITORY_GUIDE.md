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

## Adding new dependencies

Currently you must manually edit the individual `package.json` files to add packages. When adding a package name in `dependencies` or `devDependencies`, `vscode` should suggest package versions via autocomplete.

Once the required changes have been made, re-run `pnpm i`.

## Tasks in `nx` targets

Each package has a `project.json` which describes the "targets" or runnable actions/scripts that package can perform. There are also dependencies and caching information expressed such that performing any action will appropriately perform actions it depends on in the right order, cache-reading where possible.

For example, to run a particular app in dev mode, the target (action) is typically called `serve`:

```bash
pnpm nx serve halo-app
```

`nx` executes the target, and is aliased as an npm script `pnpm nx` (to avoid an unexpressed global dependency on an `nx` version). See [`nx run`](https://nx.dev/packages/nx/documents/run) for more syntax.

## Tasks in `scripts`

Packages may also declare scripts in their `package.json` `scripts` field as is traditional for an npm package. This is appropriate when `nx` caching is not suitable or necessary for the task, and when that script does not partake in the `nx` task dependency tree.

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
| `patches`               | pnpm applied patches via `npm-patch`                                                           |
| `docs`                  | a `vuepress` docs site behind `docs.dxos.org`                                                  |
| `docs/docs`             | markdown documentation content                                                                 |
| `docs/docs/guide`       | developer guide as found on `docs.dxos.org/guide`                                              |
| `docs/docs/api`         | API documentation generated from JSDoc comments in source                                      |
| `docs/docs/design`      | Design documents for future features in research and development                               |
| `docs/docs/specs`       | Descriptions of features currently being built                                                 |

## Branches

*   In general, features are developed on feature branches starting with the author's nickname e.g.: `alice/some-feature`.
*   Features merge to `main` via PRs and checks like `pnpm test` and `pnpm lint` must pass.
*   PRs have to be [titled conventionally](https://www.conventionalcommits.org/en/v1.0.0/).
*   The default branch for development is `main`, if you are contributing this is where you make PRs to.
*   Feature branches within the repo are prefixed with the contributors username.
*   External contributors may contribute by forking the repo and sending PRs from their fork.
*   All feature branches are squashed when being merged to `main`.
*   When preparing a new release, a release candidate is cut from `main` using a Github action, these branches are prefixed with `rc-`.
*   On `rc-` branches Release Please runs and calculates what the next version should be.
*   Any further bug fixes merged to the `rc-` branch will also be pushed to `main`.
*   Once the Release Please PR is merged and the release is tagged, the `rc-` branch is merged into `main` and `production` before the branch is deleted.
*   The workflow for hotfixes is identical except it starts by branching from `production` and the branch is prefixed with `hotfix-`.
*   The current workflow for `staging` is force pushing any branch there as needed, the expectation is that this would generally be only be done from `rc-` or `hotfix-` branches.

## Publishing

*   All merges to `main` automatically publish apps to dev.kube.dxos.org.
*   All merges to `staging` automatically publish apps to staging.kube.dxos.org and publish npm packages under the `next` tag.
*   All merges to `production` automatically publish apps to kube.dxos.org and publish npm packages under the `latest` tag.

## Branch Diagram

![release flow diagram](../../design/diagrams/release-flow.drawio.svg)

Based on [this post from nvie.com](https://nvie.com/posts/a-successful-git-branching-model/).

## Workflow:

*   merge release candidates and hot fixes w/ `git merge --no-ff`
*   merge feature branches by squashing
*   staging is force pushed to from other branches
*   main/production maintain history

| branch       | purpose                                                                               |
| :----------- | :------------------------------------------------------------------------------------ |
| `main`       | the only feature integration branch                                                   |
| `production` | reflects what code is in production (npm, docs sites, apps, etc) e.g. `docs.dxos.org` |
| `staging`    | reflects what code is in staging `docs.staging.dxos.org`                              |
| `release-*`  | release branches created from main and to merge with `production` or `stating`        |
| `hotfix-*`   | a hotfix branch created from `production` and destined for `production`               |


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

### Helpful aliases

```bash
alias px="pnpm -w nx"
```

More custom shell aliases can be included in your shell config via:

```bash
source $DXOS_ROOT/dxos/tools/zsh/tools-alias.zsh
```

### ESLint errors in vscode

To make all eslint errors look yellow in `vscode`, open your user preferences (not workspace preferences) and add this to the JSON:

```json
  "eslint.rules.customizations": [{ "rule": "*", "severity": "warn" }]
```

### Storybook

```
Cannot GET /` when running 'pnpm run storybook'
```

Solution:

```bash
pnpm run storybook --no-manager-cache
```

[Source](https://github.com/storybookjs/storybook/issues/14672#issuecomment-824627909)

### Mobile development

Modern browsers treat `localhost` as a secure context, allowing secure apis such a `SubtleCrypto` to be used in an application served from `localhost`, however sometimes this is not enough. For example, you may want other devices on your local network to be able to access your dev server (particularly useful when debugging issues on mobile devices). In this case you would be accessing the app via the ip address of your host machine rather than `localhost`. IP addresses are not a secure context unless they are served with https and a certificate. The apps in this repo are setup to serve the dev server with https when `HTTPS=true`. What follows are instructions on how to setup the certificate for your devices to make this work as expected:

1.  Install mkcert following the [instructions in it's README](https://github.com/FiloSottile/mkcert#installation).
2.  Run `mkcert -install` to create a new local CA.
3.  Generate a cert by running `mkcert localhost <your local IP, i.e. 192.168.1.51>`.
4.  In order for the certificate to be recognized by a mobile device the root CA must be installed on the device. Follow the [instructions from mkcert](https://github.com/FiloSottile/mkcert#mobile-devices) to enable this.
5.  Rename the cert `cert.pem` and the key `key.pem` (all .pem files are gitignored).
6.  The vite config uses a path relative from the CWD to load the key files and each app is setup with the following config:

<!---->

    {
      server: {
        https: process.env.HTTPS === 'true' ? {
          key: './key.pem',
          cert: './cert.pem'
        } : false,
        ...
      },
      ...
    }

Given this, the recommended setup is to run `serve` from the repo root and keep the `cert.pem` and `key.pem` files there. Alternatively, a copy of them could be kept in each app directory if `serve` is run from the app directory as well.

### Proxying using https://srv.us

`srv.us` is easier to setup but will lead to longer loading times.

    pnpm -w nx serve kai
    ssh srv.us -R 1:localhost:5173

    # The session-specific link will be printed.

> NOTE: The amount of files that are needed to be loaded (more then 800 in dev mode) is causing srv.us to bottlenek. On the first time the app takes just under a minute to load, and it might seem like nothing is happening.
