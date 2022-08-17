---
title: Getting started
description: DXOS SDK
---

The project is developed using [Nx](https://nx.dev/) and NodeJS version `16.14.0`.

Update the required version of Node required by `.node-version` (e.g., via `nodenv`).

```bash
brew upgrade node-build
brew upgrade nodenv

nodenv install 16.14.0
```

Install pnpm and its dependencies:

```bash
npm install -g pnpm@7.9.0
nodenv rehash
alias pnx='pnpm nx'
```

## Nx monorepo

1. To install dependencies (from the root directory):

```bash
pnpm install 
```

2. To build all packages:

```bash
pnpm nx run-many --target=build
```

3. To build one package:

```bash
pnpm nx run <target>:build
```

### Adding new dependencies

Currently you must manually edit the individual `package.json` files.
Once the required changes have been made, re-run `pnpm install` from the project root.

### Running scripts in individual packages

```
cd package/directory
pnpm <script name>
```

### Adding a new package to the monorepo

When merging monorepos it's best practice to add packages one by one, starting from the ones lowest in the dependency chain. And ensuring that the project builds after each package added.

1. Copy over package contents.
2. Add the package to the list in `<root>/workspace.json`.
3. Run `pnpm install` and fix any broken dependencies.
4. Add the toolchain internal library to build, test and lint your package.
5. Set the build script to `"build": "toolchain build"`. Look for examples in other packages.
6. Make sure that package builds.

#### Configure package.json

```
"deps": {
  "@types/node": "^16.11.27",
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

### Upgrading packages across the monorepo
To upgrade all `dxos` packages you can trigger [Upgrade DXOS dependencies](https://github.com/dxos/protocols/actions/workflows/upgrade-deps.yml) job.

If you want to upgrade some specific package or all packages that match specific regexp, you can run
```
ncu --deep -u '<PACKAGE>'
# e.g.
ncu --deep -u '@storybook/*'
```

### Release process

The Release process is described [here](https://github.com/dxos/eng/wiki/Build-System-~-Releases).

### Updating typescript project references and sort `package.json`

Trigger [Standardize configs](https://github.com/dxos/protocols/actions/workflows/sort-deps.yml) job.

### Troubleshooting Storybooks

1. `Cannot GET /"` when running `pnpm run storybook`

Solution:

```bash
pnpm run storybook --no-manager-cache
```

[Source](https://github.com/storybookjs/storybook/issues/14672#issuecomment-824627909)

## Snippets

```
# List all packages in monorepo.
pnpm ls -r --depth -1
```

## FAQ

1. Issue with `data.copy is not a function`

This is caused by incomplete browser polyfills for Node (specifically for Buffer).

Fixed by adding different polyfill for Buffer such as [here](https://github.com/dxos/protocols/blob/551f5592384f5af69f6d46960d5c895050f1f211/packages/sdk/demos/.storybook/main.js#L33).
