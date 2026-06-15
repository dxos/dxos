# Composer CRX

NOTE: The extension uses `@crxjs/vite-plugin` and the manifest is generated from the vite config (`vite.config.ts`).

## Development

```sh
moon run composer-crx:serve
```

Then click "Load unpacked" and select the **main checkout** path `packages/apps/composer-crx/dist`
(relative to the repo root, not the worktree path). Builds from linked worktrees write there
directly. Remove and re-add the extension if Chrome still points at an old worktree path.
Then click "Update" from `chrome://extensions` (popup and content script will hot reload).

See "Inspect views" for background worker logs.

## Bundling

```sh
moon run composer-crx:bundle
```

## Publishing

Google Dashboard: https://chrome.google.com/webstore/devconsole/c9e5f2e9-a1e0-4f0a-b13b-4610552e81a9

```sh
moon run composer-crx:pack
```
