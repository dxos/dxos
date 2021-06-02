# Build configuration

TODO(burdon): Move to `dxos/eng`.

## Getting started

The project is developed using [rush](https://rushjs.io/) and NodeJS version `16.1.0` via `nodenv`.

To install dependencies:

```bash
npm install -g @microsoft/rush pnpm
nodenv install 16.1.0
```

### Rush

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
4. Put the entire package lifecycle in the `build` script. it might look like `"build": "tsc && pnpm run lint && pnpm run test`. Look for examples in other packages.
5. Make sure that package builds.
6. (optional) Refactor to use Heft and rig packages.

### Package configuration with heft

A rigged package config consists of:

* `config/rig.json` file that points to the rig package.
* `tsconfig.json` that extends the tsconfig from the rig package but also specifies the out dir.
* `.eslintrc.js` that extends the .eslintrc.js from the rig package.

Rigged package should specify it's build script as:

```
"build": "heft test 2>&1"`
```

This will build the package with typescript, run eslint, and test with jest.

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

### Troubleshooting Storybooks

1. `Cannot GET /"` when running `rushx storybook`

Solution:

```bash
rushx storybook--no-manager-cache
```

[Source](https://github.com/storybookjs/storybook/issues/14672#issuecomment-824627909)

### Publishing packages

To publish all packages you need to bump the version.

#### Publishing non-breaking changes

In order to publish **non-breaking changes**, bump the patch version:

```bash
  rush version --bump --target-branch <YOUR_CURRENT_BRANCH>
```

#### Publishing breaking changes

In order to publish **non-breaking changes**, bump the minor version:

```bash
  rush version --bump --target-branch <YOUR_CURRENT_BRANCH> --override-bump minor
```
This will create a new commit with all packages' versions bumped up on your current branch. When the branch gets merged to main, changes will automatically get published to NPM.

## Rush

- Re-run `rush update` after changing any `package.json` files.
- Run `rushx build` in a local package folder to get local errors.

## Configure new modules.

Add new modules to `rush.json`

## Configure package.json

```
"deps": {
  "@types/node": "^14.0.9",
}
```

## Configure TSC

Add TS config to support browser globals.

``````
  "compilerOptions": {
    "outDir": "dist",
    "lib": [
      "DOM"
    ]
  },
  "types": ["jest", "node"],
```

## Snippets

```
# List all packages in monorepo.
pnpm ls -r --depth -1
```
