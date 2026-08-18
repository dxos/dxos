# Logos and image assets

NOTE: We tried "@vite-pwa/assets-generator", but it isn't fully implemented; pwa-asset-generator is also out of date.

Instead, use https://realfavicongenerator.net with the 512x512 transparent icon.

Run the following to generate the Windows icon.

```bash
pnpm run icons:mstile
```

## Per-channel icons

Each non-production channel installs as its own app, so it ships its own recolouring of the mark —
purple for `nightly`, greyscale for everything else. `.github/actions/cn-config` points `bundle.icon`
at the matching `src-tauri/icons-*` directory at build time.

To regenerate the variants and their icon sets from `icon.svg`:

```bash
pnpm icons:variants
```
