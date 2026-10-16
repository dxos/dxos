# autocue-ui — design

## Goal

One implementation of each piece of autocue's on-screen UI, with a storybook, used by the skill.

## Decisions

1. **Package.** `tools/autocue` (`@dxos/autocue`, private) holds the UI only. The skill's scripts stay in
   `.agents/skills/autocue/scripts` and inject the UI from it.
2. **DOM core + React wrapper.** The skill paints into arbitrary pages through `page.evaluate`, where there is no
   React and no module resolution. So each component is a plain-DOM core (`create<Name>(root, options)`) that
   renders into a shadow root, plus a React wrapper for the storybook. This is the pattern
   `react-ui-experimental`'s `Countdown` already uses.
3. **Injection.** `scripts/inject.mjs` bundles a core with esbuild (`bundle: true`, IIFE) and evaluates it in the
   page once. Unlike the Countdown's `transform`, bundling lets cores import shared tokens.
4. **Styling.** Plain CSS custom properties (`--autocue-*`) in the shadow root. The app's styles cannot reach the
   shadow root, but custom properties inherit through it, so a React host can map them to theme tokens.
5. **`tools/ident`** stays a separate Remotion package. It can consume the shared tokens later.
6. **`FrameHeader`** (react-ui-canvas, published) stays as is. A published package cannot depend on a private one.
   autocue's `Frame` matches its layout (centred title and caption) without the counter and controls.

## Inventory

| Piece                       | Current source                                       | Target                        |
| --------------------------- | ---------------------------------------------------- | ----------------------------- |
| Caption band                | `driver.mjs` `showCaption`; `compose.mjs` drawtext   | `Frame` caption               |
| Title band                  | `terminal/stage.html` `#title`; `compose.mjs` labels | `Frame` header                |
| Action feed, cursor, ripple | `overlay.mjs`                                        | `Feed`, `Cursor`              |
| Countdown                   | `react-ui-experimental`                              | stays; loaded by `inject.mjs` |
| Ident cards                 | `tools/ident` (Remotion)                             | stays; shares tokens          |

## Frame

- `mode: 'overlay'` — the header and caption are fixed over the page and the recorded app shows through. The driver
  uses this.
- `mode: 'layout'` — the header and caption sit around a `<slot>` for content. The storybook and the terminal stage
  use this.
- `headerStyle` / `captionStyle`: `band` spans the width at the edge (and in layout takes space from the content);
  `panel` floats over the content, centred and as wide as its text. Defaults: header `band`, caption `panel`.
- Panels invert the page theme (`:host-context(.dark)`; Composer marks dark mode with `html.dark`): dark in a light
  theme, light in a dark one, so they stand out from the content. Bands stay the driver's dark band.
- The caption has a fixed height (`--autocue-caption-height`), so a step with or without a subtitle never moves it.
- `size` (layout only) lays the frame out at the recording's pixel size and scales it to fit the host, letterboxed,
  so text wraps where it will in the video. The story offers 16:10 (1280×800, the driver default), 16:9
  (1920×1080) and fill.
