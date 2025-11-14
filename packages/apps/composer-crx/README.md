# Composer CRX

## Development

NOTE: The extension uses `@crxjs/vite-plugin` and the manifest is generated from the vite config (`vite.config.ts`).

```sh
moon run composer-crx:serve
```

Open:

- http://localhost:5173/popup.html

## Bundling

Bundle then click "load unpacked" (`packages/apps/composer-crx/dist`) or "Update" from `chrome://extensions`

```sh
moon run composer-crx:bundle
```

- See "Inspect views" for background worker logs.
