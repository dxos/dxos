# Logos and image assets

NOTE: We tried "@vite-pwa/assets-generator", but it isn't fully implemented; pwa-asset-generator is also out of date.

Instead, use https://realfavicongenerator.net with the 512x512 transparent icon.

Run the following to generate the Windows icon.

```bash
pnpm run icons:mstile
```

## Menu bar icon

`src-tauri/icons/menubarTemplate.png` is the macOS menu bar icon, embedded directly by `menubar.rs`. It is a
template image, so macOS discards its colour and tints the alpha channel to match the menu bar — the black
fill is Apple's authoring convention, not a rendered colour.

It is derived from `@dxos/brand`'s `composer-icon.svg`, flattened to a single fill and recentred, then thinned
by ~4.2 units (20px at a 4.8 px/unit render). The thinning is load-bearing: the mark's four rings are exactly
contiguous — they are separated by colour alone — so a plain monochrome flatten renders as one solid disc.

## Per-channel brand artwork

Every non-production channel deploys as its own app and installs beside the released one, so each ships a
recoloured mark rather than sharing production's blue: **purple** for `preview`, **rust** for `dev`,
`staging`, and anything else. Three places carry it, all generated from the same four-colour ramp:

| Artwork | Source | Generated | Selected by |
| --- | --- | --- | --- |
| Desktop app icon | `icon.svg` | `src-tauri/icons-preview`, `src-tauri/icons-rust` | `.github/actions/cn-config` |
| Favicons + manifest icons | `favicon.svg` | `favicons-purple/`, `favicons-rust/` | `src/vite/channel-branding.ts` |
| Boot loader mark | `@dxos/brand`'s `composer-icon.svg` | `boot-mark-purple.svg`, `boot-mark-rust.svg` | `src/vite/channel-branding.ts` |

The web ones key off `DX_ENVIRONMENT`, which the deploy sets via `.github/workflows/scripts/populate-env.sh`;
a local build — and every dev server — leaves it unset and gets production's artwork.

The favicon set covers everything the shell hands the browser: `index.html`'s `<link rel=icon>` entries and
the two icons `site.webmanifest` names. Both halves have to be swapped together — a browser picks the tab
and app icon from either, and a half-swapped set shows the two marks alternating.

To regenerate everything after the mark or the ramp changes:

```bash
pnpm icons:variants
```
