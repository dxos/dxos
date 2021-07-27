---
title: Getting started
description: DXOS SDK
---

The project is developed using [rush](https://rushjs.io/) and NodeJS version `16.1.0` via `nodenv`.

To install dependencies:

```bash
npm install -g @microsoft/rush pnpm
nodenv install 16.1.0
sudo ./common/scripts/install-dependencies.sh
```

## Rush

1. The project currently uses private NPM packages.
   Make sure you have access to the [`dxos`](https://www.npmjs.com/org/dxos) NPM org
   and that you are logged in to NPM (check via `npm whoami`, otherwise `npm login`).

2. To install dependencies:

```
rush update
```

3. To build packages:

```
rush build
```

### Local Development

- Re-run `rush update` after changing any `package.json` files.
- Run `rushx build` in a local package folder to get local errors.

### Adding new dependencies

```
cd package/directory

rush add [--dev] -p <package name> --make-consistent
```

### Running scripts in individual packages

```
cd package/directory

rushx <script name>
```

### Adding a new package to the monorepo

When merging monorepos it's best practice to add packages one by one, starting from the ones lowest in the dependency chain. And ensuring that the project builds after each package added.

1. Copy over package contents.
2. Add the package to the list in `<root>/rush.json`.
3. Run `rush update` and fix any broken dependencies.
4. Add the toolchain internal library to build, test and lint your package.

```
rush add --dev -p @dxos/toolchain-node-library --make-consistent
```

5. Set the build script to `"build": "toolchain build"`. Look for examples in other packages.
6. Make sure that package builds.

#### Configure package.json

```
"deps": {
  "@types/node": "^14.0.9",
}
```

#### Configure TSC

Add TS config to support browser globals.

```
  "compilerOptions": {
    "outDir": "dist",
    "lib": [
      "DOM"
    ]
  },
  "types": ["jest", "node"],
```

### Sorting `package.json`

```
npx @sfomin/for-each-package -n "@dxos/*" "npx sort-package-json"
```

### Upgrading packages across the monorepo

```
ncu --deep -u '<PACKAGE>'

# e.g.
ncu --deep -u '@storybook/*'
```

### Release process

1. Go to a clean `main` branch.
2. The `main` branch is protected, branch off of `main` in order to commit version bumps
3. Determine the bump type:
    * Run `rush version --bump` for **non-breaking** changes.
    * Run `rush version --bump --override-bump minor` for **breaking** changes.
4. Rush created changelog files. Remove them using `git status --porcelain | awk '($1=="??" && ($2 ~ /\/CHANGELOG.md/ || $2 ~ /\/CHANGELOG.json/)) {print $2}' | xargs rm`.
5. Commit the changes with `git commit -a -m "Release vX.Y.Z"`.
6. Push the changes to the remote.
7. Create a PR back into `main`.
8. The CI will publish the changes to NPM once the PR is merged.
9. Create a github release.
    * Run `git log --pretty=format:"* %s"` to get the release notes.

### Troubleshooting Storybooks

1. `Cannot GET /"` when running `rushx storybook`

Solution:

```bash
rushx storybook--no-manager-cache
```

[Source](https://github.com/storybookjs/storybook/issues/14672#issuecomment-824627909)

## Snippets

```
# List all packages in monorepo.
pnpm ls -r --depth -1
```

## Updating typescript project references

```
npx @monorepo-utils/workspaces-to-typescript-project-references
```

## Linking packages to outside repositories

During development, sometimes there is a need to link a package from `protocols` to another repository, in order to test the integration locally without the need to publish a new version to `NPM`.

1. Log into `npm` and save the authentication token for later

```bash
npm login

cat ~/.npmrc | grep registry.npmjs.com
```

2. Install and launch [Verdaccio](https://verdaccio.org/)

3. Configure package managers to use Verdaccio, and create Verdaccio user

```bash
npm set registry http://localhost:4873/
pnpm set registry http://localhost:4873/
yarn config set registry http://localhost:4873/

npm adduser
pnpm login
```

4. Configure Verdaccio with credentials to `NPM`

Verdaccio acts as a proxy to `NPM`.

Some of our packages are private, so we need to configure Verdaccio with our credentials to `NPM`

Edit `~/.config/verdaccio/config.yaml`:

```yaml
(...)

uplinks:
  npmjs:
    url: https://registry.npmjs.org/
    auth:
      type: bearer
      token: <TOKEN FROM STEP 1.>
```

Then, restart Verdaccio.

5. Publish local `protocols` to Verdaccio

First, bump the versions:

```bash
rush version --bump --override-bump prerelease
```

Then, change the publishing config at `protocols/common/config/rush/.npmrc-publish`:

```
registry=http://localhost:4873
always-auth=false
//localhost:4873/:_authToken="<VERDACCIO TOKEN"
```

Verdaccio token can be taken similarly as step 1.:

```bash
cat ~/.npmrc | grep localhost
```

If it's not there, go back to step 3.

After that, publish:

```
rush publish --publish --include-all
```

Visit the UI at `http://localhost:4874/` to verify the packages are there.

6. Install locally published packages in outside repositories.

```bash
yarn add @dxos/name@a.b.c-d
```

### Resetting Verdaccio

Clear Verdaccio's storage:

```bash
rm -rf ~/.local/share/verdaccio/storage/*
```

Then, start Verdaccio again.
