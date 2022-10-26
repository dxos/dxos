# DXOS Monorepo

## Getting Started

To get started you will need:

- A Linux or Mac workstation with plenty of RAM (min. 16G).
- Basic developer tools and shell environments (e.g., `zsh`, `git`).
- Additional tools listed below.
- An IDE such as Webstorm or VSCode.

The primary developer toolchain consists of the following tools, 
plus a suite of customs tools and components invoked via Nx.

| Tool    | Description                           | Link                                                    |
|---------|---------------------------------------|---------------------------------------------------------|
| `npm`   | NPM package manager                   | https://docs.npmjs.com/cli/v7/configuring-npm/install   |
| `n`     | NodeJS version manager                | https://www.npmjs.com/package/n                         |
| `pnpm`  | NPM package manager                   | https://pnpm.io                                         |
| `nx`    | Nx monorepo tool (invoked via `pnpm`) | https://nx.dev/getting-started/intro                    |

Install `npm` and various other useful tools.

```bash
# OS/X
brew install npm
brew install coreutils
brew install jq

# Linux
sudo apt-get install npm
sudo apt-get install coreutils 
sudo apt-get install jq
```

Install `n` and `pnpm`:

```bash
npm i -g n
npm i -g pnpm@7.9.0
```

On Ubuntu or other linux systems, the following dependencies may be needed for pnpm install to succeed:

```bash
# From https://github.com/octalmage/robotjs/#building
sudo apt-get install libxtst-dev libpng++-dev
```

To prevent the need for `sudo` when running tools it is recommended to `chown` the relevant bin folders:

```bash
sudo mkdir -p /usr/local/n
sudo chown -R $(whoami) /usr/local/n

# Recommended
sudo mkdir -p /usr/local/bin /usr/local/lib /usr/local/include /usr/local/share
sudo chown -R $(whoami) /usr/local/bin /usr/local/lib /usr/local/include /usr/local/share
```

Install the required `node` version (from the `.node-version` file in the root of the repo):

```bash
n i $(cat .node-version)
node --version
```

## Tools aliases

```bash
alias px="pnpm -w nx"
```

## Custom aliases

Custom shell aliases can be included in your shell config:

```bash
source $DXOS_ROOT/dxos/tools/zsh/tools-alias.zsh
```

## Using NX in the repo

To Install dependencies from the root directory:

```bash
pnpm install
```

To build all packages:

```bash
pnpm nx run-many --target=build
```

To check all tests pass (this is run by CI):

```bash
pnpm nx run-many --target=test
```

To build an individual package (optionally with the `watch` flag):

```bash
pnpm nx build <target> --watch
```

To fix all lint errors (whole repo, slow)
```bash
pnpm nx run-many --target=lint --fix
```
To fix lint errors only within (you can configure HEAD and BASE, by default it's your branch against main)
```bash
pnpm nx affected --target=lint --fix 
```
For specific packages:
```bash
pnpm nx run-many --projects=docs,config --target=lint --fix
```

## Adding new dependencies

Currently you must manually edit the individual `package.json` files.
Once the required changes have been made, re-run `pnpm install` from the project root.

## Adding a new package to the monorepo

When merging monorepos it's best practice to add packages one by one, starting from the ones lowest in the dependency chain. And ensuring that the project builds after each package added.

1. Copy over package contents.
2. Add the package to the list in `<root>/workspace.json`.
3. Run `pnpm install` and fix any broken dependencies.
4. Add the toolchain internal library to build, test and lint your package.
5. Set the build script to `"build": "toolchain build"`. Look for examples in other packages.
6. Make sure that package builds.

## Configure package.json

```
"deps": {
  "@types/node": "^16.11.58",
}
```

## Configure TSC

Add TS config to support browser globals.

```
  "compilerOptions": {
    "outDir": "dist",
    "lib": [
      "DOM"
    ]
  },
  "types": ["mocha", "node"],
```

## Upgrading packages across the monorepo
To upgrade all `dxos` packages you can trigger [Upgrade DXOS dependencies](https://github.com/dxos/dxos/actions/workflows/upgrade-deps.yml) job.

If you want to upgrade some specific package or all packages that match specific regexp, you can run
```
ncu --deep -u '<PACKAGE>'
# e.g.
ncu --deep -u '@storybook/*'
```

## Release process

The Release process is described [here](https://github.com/dxos/eng/wiki/Build-System-~-Releases).

## Updating Typescript Project References

Trigger [Standardize configs](https://github.com/dxos/dxos/actions/workflows/sort-deps.yml) job.

Note, this also sorts `package.json`.

## Snippets

```
# List all packages in monorepo.
pnpm ls -r --depth -1
```

## Troubleshooting

1). Issue with `data.copy is not a function`.

This is caused by incomplete browser polyfills for Node (specifically for Buffer).
Fixed by adding different polyfill for Buffer such as [here](https://github.com/dxos/dxos/blob/551f5592384f5af69f6d46960d5c895050f1f211/packages/sdk/demos/.storybook/main.js#L33).

2). `Cannot GET /` when running `pnpm run storybook`

Solution:

```bash
pnpm run storybook --no-manager-cache
```

[Source](https://github.com/storybookjs/storybook/issues/14672#issuecomment-824627909)
