# @dxos/ui-icons

Extended icons for the DXOS UI: glyphs that Phosphor does not provide, drawn to match it.

Brand marks (DXOS, ECHO, HALO, …) do not belong here — those are the `dx` set in
[`@dxos/brand`](../brand/assets/icons).

## Usage

```tsx
import { Icon } from '@dxos/react-ui';

<Icon icon='px--anthropic--regular' />;
```

`@dxos/ui-icons` is private, so consumers of published packages reference the symbol name as a
string literal rather than importing `PxIcons`; the exported map is for in-repo code and for
pinning the catalog (see below).

## Previewing

```bash
DX_STORIES=ui/ui-icons moon run ui-icons:storybook
```

Serves [`src/Icons.stories.tsx`](./src/Icons.stories.tsx) on port 9009 (pass `-- --port=<n>` when
9009 is taken): every entry of `PxIcons` at six sizes from 64px down to 16px, beside the nearest
Phosphor glyphs, with the storybook theme toggle for light/dark. `DX_STORIES` narrows the story
crawl to this package, which is what makes the boot quick.

The gallery reads `PxIcons`, so a new icon appears without editing the story. Each cell is outlined
because a symbol missing from the sprite renders *nothing* — without a boundary that is
indistinguishable from a blank cell.

### Editing an SVG

Redraw an icon and the page reloads with it — no restart. `@dxos/vite-plugin-icons` hands every
resolved asset to Vite's watcher and fingerprints the sprite by each file's mtime and size, so a
redraw (which changes no symbol *count*) still produces a fresh sprite, and the plugin then asks the
client to reload. The reload is needed because the icon registry ingests `icons.svg` once per
document.

A name with no SVG behind it is reported and omitted rather than fatal:

```
[icons] No asset for symbol: px--typo--regular — omitted from the sprite, so the icon
renders blank. Check the name against the icon set.
```

Add the missing file and the sprite picks it up in place, still without a restart.

## Adding an icon

1. Add `assets/<name>.svg`, kebab-case, letters and `-` only — the build's symbol pattern is
   `[a-z]+[a-z-]*`, so digits will not match.
2. Add `<name>: 'px--<name>--regular'` to `PxIcons` in [`src/index.ts`](./src/index.ts).
3. Check it in the gallery above at 16px, in both themes.

The SVG must be `viewBox="0 0 256 256"` with `fill="currentColor"` and no hardcoded colors, or the
glyph will not scale or take the theme. Phosphor's regular weight is a 16-unit stroke rendered as
filled geometry with 8-unit round caps, inset to x ∈ [40, 216] — match that and the icon sits
beside `ph` glyphs without looking grafted on.

Phosphor publishes no template (their CONTRIBUTING declines icon contributions); the numbers above
were measured off `@phosphor-icons/core/assets/regular`. To draw against the real thing, the
[Figma community file](https://www.figma.com/community/file/903830135544202908/phosphor-icons)
carries every glyph in editable form.

### Exporting from a vector editor

`fill="currentColor"` is **not** something to add by hand: the sprite build stamps it onto every
symbol (`normalizeSprite` in `@dxos/vite-plugin-icons`), so an export that declares no fill still
follows the theme. Editors drop the attribute on every re-export, which is exactly why patching the
file does not hold.

Two things the build cannot fix for you:

- **A literal color in an inline `style`** — `stroke:black`, `fill:#000`. A style declaration
  overrides the symbol's fill attribute, so the glyph stays that color in both themes. The build
  prints `[icons] Hardcoded color in symbol: …` and names the symbol; replace the literal with
  `currentColor` in the source SVG.
- **Stroke weight** — `stroke-width:1px` → `16px`. Phosphor's stroke is 16 units at this viewBox,
  so an editor's default hairline is invisible at icon sizes.

A stroked circle of radius 96 with a 16 stroke is exactly `ph--circle--regular`'s ring (outer 104,
inner 88) — matching a Phosphor glyph's geometry is the quickest way to confirm the weight is right.
Keeping the drawing stroked is fine here; Phosphor itself converts strokes to filled paths, which
matters only if a glyph needs non-uniform weight. Editor sources belong in `resources/`, not
`assets/`.

Only the `regular` weight exists: these are single-weight drawings, and the hosts' symbol pattern
rejects `px--*--bold` and friends.

## How the set reaches the sprite

`@dxos/vite-plugin-icons` scans host sources for `px--*--regular` literals and compiles the matching
`assets/*.svg` into `public/icons.svg`, which `<Icon>` renders via `<use href='#px--…--regular'>`.

Two consequences worth knowing:

- **A name the scanner never sees renders blank.** `@dxos/react-ui`'s icon registry can fetch a
  missing `ph` glyph at runtime from `/phosphor`, but no such route is configured for `px`, so this
  set is sprite-only. Hosts therefore list `src/index.ts` in `scanPaths`, which puts every entry of
  `PxIcons` in the sprite whether or not anything imports it.
- **A name with no SVG behind it fails the build.** `makeSprite` reads each scanned symbol's file
  and rejects if it is missing, so keep `PxIcons` and `assets/` in step.

Hosts wiring the set: [composer-app](../../apps/composer-app/vite.config.ts),
[composer-crx](../../apps/composer-crx/vite.config.ts),
[storybook-react](../../../tools/storybook-react/.storybook/main.ts).
