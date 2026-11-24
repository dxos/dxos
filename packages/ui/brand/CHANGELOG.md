# @dxos/brand

## 0.17.0

### Minor Changes

- 8ca9141: Each background in `assets/backgrounds` whose icon sits on one side now comes as a pair, `bg-<name>-left.svg` and `bg-<name>-right.svg`, for `dxns`, `echo`, `halo`, `kube` and `mesh`. `bg-dxos.svg` is unchanged.

  **Breaking:** the single-sided files `bg-dxns.svg`, `bg-echo.svg`, `bg-halo.svg`, `bg-kube.svg` and `bg-mesh.svg` are removed. Each is now the variant named for its icon's side: `bg-echo-left.svg`, `bg-kube-left.svg`, `bg-dxns-right.svg`, `bg-halo-right.svg` and `bg-mesh-right.svg`.

- a551ab6: Every background mark now comes with its icon on the left, in the centre and on the right (`bg-<name>-center.svg`), and PLEX and TILE join the set. A background's lines take the drawing's text color where `--dx-bg-lines` is not set, with the mark's own color as the default, so `color` on the `<svg>` recolors them. `scripts/flip-backgrounds.mjs` is now `scripts/place-backgrounds.mjs` and writes the other two placements from the one that was edited.
- 0ad95b7: The brand assets carry one set per mark, under one name. `icons/<mark>.svg` is the themeable shape the `dx--` sprite is built from, `icons/{black,white}/<mark>.svg` are the colour-locked copies an `<img>` or a packaged sprite needs, `backgrounds/<mark>-{center,left,right}.svg` place it, and `backgrounds/cards/<mark>-{1,2}x.svg` crop it to a card. The `icon-` and `bg-` prefixes are gone — the folder already says which it is.

  The two renamed marks take their current names: KUBE is EDGE and DXNS is SAGE, in the asset names and in the `EDGE` and `SAGE` icon components. `PLEX` and `TILE` icon components are added, so all eight marks have one; DXOS joins the others as `backgrounds/dxos-center.svg` and gains its card crops. `logotypes/dxos-horizontal-block.svg` was a typo for `black`.

- c1d5cd3: PLEX and TILE have icons of their own in `@dxos/brand`'s `assets/icons`, with black and white variants, and both marks are redrawn: PLEX has four of its six lines cut where they cross another, and TILE is its diamond cut into quarters three times over. The PLEX and TILE backgrounds draw the new marks. `CanvasEditor.Root` takes `fitZoom`, the highest zoom a fit reaches, so a host can open a small scene smaller than 1:1; the calendar's week view scrolls in a react-ui `ScrollArea`; and the zoom and action buttons on a globe or a map sit closer together.
- b15e5c3: The deck's title-slide artwork is a brand asset: `bg-dxos-glow.svg` is that slide exported from Figma as SVG, with its text dropped and a fractal-noise grain laid over it so the long dark ramp of its glow stops banding at 8 bits.

  `<Box variant="title">` and `<Box variant="caption">` carry a title slide's two blocks — the name with the deck's links under it, and the brand lockup with the small print at the foot — on one start edge, at the measurements of the Figma slide they reproduce. The sixth cover story draws that slide, with the artwork as its background.

### Patch Changes

- 8ad08cb: The background SVGs in `assets/backgrounds` are rebuilt with the icon in its own group, normalized size and placement, and line, icon and fill colors that can be set through the `--dx-bg-lines`, `--dx-bg-icon` and `--dx-bg-fill` CSS variables when the SVG is inlined.
- b15e5c3: A grid's children name the tracks they cover as `colSpan`/`rowSpan`, as a table cell and CSS's `grid-column: span n` do; `cols`/`rows` now only ever mean the tracks a `<Grid>` lays down, so a count of tracks laid down never reads the same as a count of tracks covered.

  Card art is cut to the card. `gen-card-art.mjs` writes one crop per mark per card width into `backgrounds/cards/`: each is the same height and centred on the mark, so a card spanning two columns fills its width without drawing its mark larger than its neighbours' — which `object-fit` cannot do, since it takes its scale from the box. The rays are run past the frame first, so the wider crop has no bare edge.

  The brand's `icons/{white,black}` marks carry their own size instead of `width="100%"`, which left them with no intrinsic size and collapsed them to nothing wherever they were drawn as an `<img>`.

  `<Box variant="hero">` draws a lone image at a title slide's scale and `<Box variant="watermark">` runs one oversized off the slide's start edge behind the words. Five cover stories draw the brand's own lockup with them, so a title slide sets the name in the brand face rather than as a heading.

- b15e5c3: Each suite background now ships in its own mark's colour. Five of the seven carried another topic's — ECHO's art was TILE's red — which is why every consumer rewrote the `color` attribute before drawing them; only the two redrawn most recently were right. The presenter's layout story reads them from `assets.dxos.org/brand/backgrounds`, which mirrors this package, rather than inlining them as data URIs, so a redrawn mark reaches the slide without a code change and the story's markdown stays legible.
- @dxos/ui-theme@0.17.0

## 0.16.0

### Patch Changes

- @dxos/ui-theme@0.16.0

## 0.15.0

### Patch Changes

- @dxos/ui-theme@0.15.0

## 0.14.0

### Minor Changes

- c6e9fd9: Export `composerRingPaths` (and the `ComposerRing` type) so each ring of the Composer mark can be rendered and animated on its own.

### Patch Changes

- 085dcb1: `@dxos/brand` ships Poiret One (`assets/fonts/poiret-one`), the face of the Composer wordmark. The Markdown, Sheet, Tables and Projects plugins' details now include a narrated demo video, opening on the Composer ident.
- Updated dependencies [b07f49f]
  - @dxos/ui-theme@0.14.0

## 0.13.0

### Patch Changes

- @dxos/ui-theme@0.13.0

## 0.12.0

### Minor Changes

- 9714c75: `@dxos/brand/channels` names the prerelease channels (`dev`, `preview`, `staging`) and the colour each one paints the mark, and `channelMarkFilter` turns that colour into a CSS filter over the released artwork. The boot loader applies that filter to the mark, the ring and its head together, so a channel build no longer ships its own copy of the mark and the ring agrees with it; the composer app's icon variants are generated from the same definitions. The brand `Icons` story shows the channels in a row.

  The boot loader's activation row is a flex row translated as one group: a plugin's icon is appended at the end and fades in, and the row slides half a slot to stay centred on an eased count driven by the same frame loop as the ring, so arrivals in quick succession keep the row moving rather than stopping it between each.

  Breaking: `react-ui`'s `Stepper` is renamed `Steps`, after the Ark machine it sits on, as the rest of the family is named: `StepsProps`, `StepsStyleProps`, `stepsTheme` and the `steps.*` theme keys follow. The `Step`, `StepOptions`, `stepCount` and `stepAt` helpers keep their names.

### Patch Changes

- Updated dependencies [6a457ac]
- Updated dependencies [2d58ea5]
- Updated dependencies [b63506b]
- Updated dependencies [6af89f4]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [818a096]
- Updated dependencies [08cddf6]
- Updated dependencies [d4b4919]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [6a1ec57]
- Updated dependencies [32584c9]
- Updated dependencies [631df48]
- Updated dependencies [928e0b2]
- Updated dependencies [520c34f]
  - @dxos/ui-theme@0.12.0

## 0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [e0e1a9f]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [2fe5a7a]
- Updated dependencies [d958118]
- Updated dependencies [e65432c]
- Updated dependencies [c9651f1]
- Updated dependencies [717edc0]
- Updated dependencies [51aaffe]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [55bb048]
- Updated dependencies [4df6cf3]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
  - @dxos/react-ui@0.11.0
  - @dxos/ui-theme@0.11.0
