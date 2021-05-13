# Build configuration

TODO(burdon): Move to dxos/org?

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
