# Composer CRX

NOTE: The extension uses `@crxjs/vite-plugin` and the manifest is generated from the vite config (`vite.config.ts`).

## Development

```sh
moon run composer-crx:serve
```

Then click "load unpacked" (`packages/apps/composer-crx/dist`) or "Update" from `chrome://extensions` (popup and content script will hot reload).

See "Inspect views" for background worker logs.

## Bundling

```sh
moon run composer-crx:bundle
```
