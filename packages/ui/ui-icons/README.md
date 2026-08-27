# @dxos/ui-icons

Extended icons for the DXOS UI: glyphs that Phosphor does not provide, drawn to match it.

Brand marks (DXOS, ECHO, HALO, …) do not belong here — those are the `dx` set in
[`@dxos/brand`](../brand/assets/icons).

## Usage

```tsx
import { Icon } from '@dxos/react-ui';

<Icon icon='px--outliner--regular' />;
```

`@dxos/ui-icons` is private, so consumers of published packages reference the symbol name as a
string literal rather than importing `PxIcons`; the exported map is for in-repo code and for
pinning the catalog (see below).

## Adding an icon

1. Add `assets/<name>.svg`, kebab-case, letters and `-` only — the build's symbol pattern is
   `[a-z]+[a-z-]*`, so digits will not match.
2. Add `<name>: 'px--<name>--regular'` to `PxIcons` in [`src/index.ts`](./src/index.ts).

The SVG must be `viewBox="0 0 256 256"` with `fill="currentColor"` and no hardcoded colors, or the
glyph will not scale or take the theme. Phosphor's regular weight is a 16-unit stroke rendered as
filled geometry with 8-unit round caps, inset to x ∈ [40, 216] — match that and the icon sits
beside `ph` glyphs without looking grafted on.

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
