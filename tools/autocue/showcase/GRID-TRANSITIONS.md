# Grid transitions

Research notes and the prototype variants for the showcase grid. The prototypes are stories in
[`Grid.stories.tsx`](../src/components/Grid/Grid.stories.tsx); the layouts and timelines are in
[`reveal.ts`](../src/components/Grid/reveal.ts), [`deck.ts`](../src/components/Grid/deck.ts) and
[`border.ts`](../src/components/Grid/border.ts).

Reference: [Grid Transitions (After Effects template)](https://www.youtube.com/watch?v=GYcYHWn3MpQ), the cut the
shift loop is modelled on.

## Links

Stories (storybook on :9009; the border style is the `border` control on any story):

1. `shift`: [clips](http://localhost:9009/?path=/story/tools-autocue-grid--shift-clips) ·
   [tours](http://localhost:9009/?path=/story/tools-autocue-grid--shift-tours) ·
   [numbers](http://localhost:9009/?path=/story/tools-autocue-grid--shift-numbers) ·
   overview [numbers](http://localhost:9009/?path=/story/tools-autocue-grid--shift-overview-numbers) ·
   [clips](http://localhost:9009/?path=/story/tools-autocue-grid--shift-overview-clips) · drift
   [clips](http://localhost:9009/?path=/story/tools-autocue-grid--shift-drift-clips)
2. `columns`: [tours](http://localhost:9009/?path=/story/tools-autocue-grid--columns-tours) ·
   [numbers](http://localhost:9009/?path=/story/tools-autocue-grid--columns-numbers)
3. `steps`: [tours](http://localhost:9009/?path=/story/tools-autocue-grid--steps-tours) ·
   [numbers](http://localhost:9009/?path=/story/tools-autocue-grid--steps-numbers)
4. `mosaic`: [tours](http://localhost:9009/?path=/story/tools-autocue-grid--mosaic-tours) ·
   [numbers](http://localhost:9009/?path=/story/tools-autocue-grid--mosaic-numbers)
5. `zoom`: [tours](http://localhost:9009/?path=/story/tools-autocue-grid--zoom-tours) ·
   [numbers](http://localhost:9009/?path=/story/tools-autocue-grid--zoom-numbers) ·
   [default](http://localhost:9009/?path=/story/tools-autocue-grid--default)
6. [Showcase](http://localhost:9009/?path=/story/tools-autocue-showcase--default)
   ([`Showcase.stories.tsx`](../src/components/Grid/Showcase.stories.tsx)): the Composer ident, the three tour clips
   reached by shifts, a zoom out to the drifting wall, then the end card, looped. A drifting wall re-deals its clips
   so no recording shows twice in a column, using the `layout.json` that `layout.mjs` writes.

Renders (local only, under the gitignored `temp/grid-variants/`):

- Previews, 60s with no audio: [shift-clips-preview.mp4](../../../temp/grid-variants/shift-clips-preview.mp4) ·
  [console-clips-preview.mp4](../../../temp/grid-variants/console-clips-preview.mp4)
- Contact sheets: [console-clips-contact.png](../../../temp/grid-variants/console/console-clips-contact.png) ·
  [borders-contact.png](../../../temp/grid-variants/borders/borders-contact.png) ·
  [borders-mid.png](../../../temp/grid-variants/borders/borders-mid.png)
- Reference: [Grid Transitions (After Effects template)](https://www.youtube.com/watch?v=GYcYHWn3MpQ)

## What After Effects does

"Grid transition", "video wall" and "photo wall" templates share one build: every clip is a precomp placed on a
grid, all parented to a null or a 3D camera, and the null's scale and position are keyframed. The common patterns:

- **Pull back to a wall.** Start on one clip full frame, then scale the null down until a wall of clips shows. The
  PSD Pro "Grid zoom out intro" and Motion Array's video wall walkthrough both work this way.
- **Columns scrolling in alternating directions.** Each column is its own precomp with a looping position
  expression (`loopOut()`), and odd columns run the other way. It shows up mostly as web "infinite columns"
  components, but it is the same technique.
- **Staggered, masonry and mosaic tiles.** Tiles of mixed sizes arrive with a stagger. Motion Array's Geometric Grid
  Transitions and Wall Photo Gallery, and Envato's grid packs, are examples.
- **Parallax and tilt.** 3D layers at different depths under a moving camera, sometimes with the wall turned in
  perspective (Motion Array 3D Photo Logo Reveal, Videezy Cascading Slideshow, Adobe's parallax tutorial).
- **Gutters.** The gap is set by scaling each tile inside its cell rather than by the grid (Adobe Community's Motion
  Tile thread). GridSmith exposes the gutter as a control.

The reference the user picked (YouTube `GYcYHWn3MpQ`, "Grid Transitions") is tighter than most templates:

- It never frames more than 2x2 or 3x2, and it never zooms far out.
- Tiles sit edge to edge, with a thin gap or none at all. Clips are cropped to fill their cells.
- It cycles: full frame, then a grid, then one cell grows back to full frame, then a new grid. Each step lasts about
  0.5s, with a hard ease, a slide and a push-in.
- New cells slide or push in from outside the frame. They do not scale in. Each cut lands on a new set of clips.
- It mixes grid shapes: 2x2, a 2-up split, 3x2, and one big tile with small ones.

Its clips are vibrant photos with solid colour at the edges, so they separate without a frame. Our clips are app
screens with light edges and their own chrome. Butted together they read as one sheet, so the cells need a border
(see [Borders](#borders)).

**Gutter and ground.** Light templates put the tiles on a mid or dark neutral, not on white, so each tile reads as
its own shape. Dark templates use a near-black ground. The grid's light ground is now `neutral-250` instead of the
near-white group surface. Dark mode keeps the group surface.

Sources:
[PSD Pro grid zoom-out intro](https://psdpro.gumroad.com/l/Free-After-effects-Intro),
[Motion Array video wall intros](https://motionarray.com/learn/after-effects/after-effects-video-wall-intros/),
[Creative COW video wall thread](https://creativecow.net/?p=1838526),
[Motion Array Wall Photo Gallery](https://motionarray.com/after-effects-templates/wall-photo-gallery-331709/),
[Motion Array 3D Photo Logo Reveal](https://motionarray.com/after-effects-templates/3d-photo-logo-reveal-208951),
[Motion Array Geometric Grid Transitions](https://motionarray.com/after-effects-templates/geometric-grid-transitions-962328/),
[Videezy Cascading Slideshow](https://www.videezy.com/after-effects-templates/11088-cascading-4k-slideshow-after-effects-template),
[Adobe: animate a picture with parallax](https://www.adobe.com/learn/after-effects/web/animate-picture),
[Adobe Community: Motion Tile gaps](https://community.adobe.com/t5/after-effects-discussions/motion-tile-after-effects-making-gaps-between-the-tiles-smaller/m-p/10220875),
[GridSmith](https://thecreativesupply.gumroad.com/l/GridSmith),
[ProVideo Coalition: automatic grid layouts](https://www.provideocoalition.com/automatic-grid-layouts-in-after-effects/),
[School of Motion: loop expressions](https://www.schoolofmotion.com/blog/amazing-expressions-in-after-effects),
[Framer infinite columns](https://app.byq.supply/gems/infinite-columns-01).

## Constraint: never more than 3x3

A tile smaller than about a third of the frame stops reading as an app screen, and the deep zoom-out is where
scaling aliasing shows. Every variant except the `zoom` baseline frames 3x3 at most. Instead of one big zoom-out, they
show a few long tour videos and then a fast montage of about a dozen other clips.

## Variants

All variants are deterministic in time: `window.grid.seek(ms)` gives the same frame for the same time, so
`render.mjs --story <id>` renders any of them frame by frame.

| Variant   | Stories (`tools-autocue-grid--…`)                   | What it does                                                                      |
| --------- | --------------------------------------------------- | --------------------------------------------------------------------------------- |
| `shift`   | `shift-numbers`, `shift-tours`, `shift-clips`       | **Variant 1.** A loop of close-up, snap out to 3x3, row or column shift, snap in. |
| `console` | none: set `variant: 'console'` on a shift story     | The shift loop on a wall laid out as one giant Composer window.                   |
| `zoom`    | `default` (unchanged), `zoom-numbers`, `zoom-tours` | Baseline: the original tour and straight zoom-out to the whole 6x6.               |
| `columns` | `columns-numbers`, `columns-tours`                  | After the tour, pulls back to 3 columns that scroll up and down, alternating.     |
| `steps`   | `steps-numbers`, `steps-tours`                      | After the tour, a camera montage over 2x2 windows: pull out, push in, whip-pan.   |
| `mosaic`  | `mosaic-numbers`, `mosaic-tours`                    | After the tour, the AE cycle with a fixed camera: full, grid, grow, new grid.     |

What each story's cells contain:

- `-numbers`: every cell shows its number on a hue tone. Works in light and dark.
- `-tours`: the tour clips, with every other cell numbered.
- `-clips`: the tour clips plus the grid clips in `temp/grid-zoom/`.

Open a story in both themes with `http://localhost:9009/iframe.html?id=tools-autocue-grid--shift-numbers&globals=theme:dark`.

### 1. `shift` — the shift loop (primary)

1. Cell A is a close-up that fills the frame, and its clip plays.
2. The camera snaps out to the 3x3 around it (`zoomMs`, 600ms, strong ease-in-out).
3. After the zoom has finished, the rows shift. The top row moves right, the middle row left, the bottom row right.
   The next cycle shifts the columns instead: left down, middle up, right down. A shift matches the zoom (`shiftMs`, 600ms,
   sharp ease). It moves 1 or 2 cells, and the distance varies from cycle to cycle (`shiftDistance`: 0 varies it,
   1 or 2 fixes it).
4. The camera snaps in on the cell that has landed in the centre, which becomes close-up B.

The wall is a torus of all 36 cells, so a row or column that slides out on one side comes back in on the other,
outside the frame. No edge shows. The cells are seeded so that each close-up in the sequence lands in the centre on
its turn.

Timeline (the defaults, all args):

- Close-ups 1 to 3 are markdown, projects and inbox, in 10s slots (`tourSlot`). Each tour plays its first 10s.
- Close-ups 4 to 13 are 10 cells in 3s slots (`montageSlot`). The montage is meeting first, then explorer, map,
  chess, spacetime, explorer, chess, meeting, explorer, chess (`montage`, row-major cell indices), so map and
  spacetime show once each.
- A slot runs from one landed close-up to the next: its hold plus one 1.8s transition (0.6s out, 0.6s shift, 0.6s
  in). A 3s slot is therefore 1.2s of hold. The total is 60s.

### 2. `console` — the Composer deck

The same loop on a bento built from Composer's own regions, which reads as one giant Composer window:

- From left to right: the L0 rail of space-avatar swatches, the navtree column (3 cells, cropped to their left
  edge), three planks, the companion column (2 cells, cropped to their right edge) and the right rail of icons.
- The centre plank is wide and the planks on either side are half its width. Each plank is a stack of three sections,
  and each section has a header strip (icon, breadcrumb title, fullscreen and close icons) above a 16:9 clip.
- The theme tokens draw the regions: `bg-base-surface` panels, with `separator` hairlines between them. The dividers
  are the border, so the cells need no extra frame.
- The zoomed-out view shows the whole console, about 2.7 plank widths across, which is the 3x3 limit (a plank is
  about 30% of the frame at 1080p).
- Shifts alternate. On even cycles the deck scrolls sideways, as in Composer's deck scroll, and a plank widens as it
  slides into the centre slot. On odd cycles the plank stacks scroll up and down in alternate directions. On every
  cycle the navtree and companion cells slide vertically in opposite directions.
- The camera always snaps in on the centre plank's middle section. It uses the same 60s timeline and args as `shift`.

### 3. `columns` — alternating columns

After the tour, the camera pulls back to three columns around the last tour cell, about 3 rows high, and each column
scrolls without end. Even columns move up and odd columns move down, at one row every 3s, with a gentle ramp-up. The
columns wrap around the 6-row wall outside the frame.

### 4. `steps` — 2x2 camera montage

After the tour, the camera makes a montage of cuts that never frames more than 2x2. It pulls out to the 2x2 around
the last tour cell, pushes in on a neighbour, whip-pans full frame across the wall, pulls out to a new 2x2, and so
on: 9 legs, each a 500ms move, with holds that get shorter (from 1.5x to 0.5x the mean).

### 5. `mosaic` — the After Effects cycle

The camera stays fixed and the cells move in screen space. The sequence runs full frame, then 2x2, then one cell
grows to full frame, then 3x2, a grow, a 2-up split, a grow, one big tile with two small ones, a grow, and finally
3x2. New clips push in from the nearest frame edge, and leaving clips are pushed out. Cuts last 500ms, the holds get
shorter, and the cells sit edge to edge with a 6px gap, cropped to fill. About 16 clips pass.

### Considered and dropped

- **Masonry wall** (staggered heights on a dark ground) and **tilted infinite wall** (perspective and parallax).
  Both need a frame wider than 3x3 to read as a wall.
- **Tiles shrinking as gutters open** (a dense grid). This is a zoom-out by another name.

## Borders

The `border` arg (all variants) frames each cell. Every size is a fraction of the tile's on-screen width, so the
frame scales with the camera and a close-up keeps a thin edge. `borderFade` fades the frame out as a cell grows to
fill the view.

| `border`   | Look                                                                        |
| ---------- | --------------------------------------------------------------------------- |
| (unset)    | The original: square-ish tiles on the darker neutral ground.                |
| `gutter`   | A dark solid gutter, about 2% of the cell width, with square corners.       |
| `card`     | Rounded corners (about 12px at 3x3, 1080p), soft drop shadow, theme ground. |
| `mat`      | The clip inset to 92% inside a darker cell panel, like a passe-partout.     |
| `bezel`    | A dark rounded bezel, about 7px at 3x3, around each clip.                   |
| `hairline` | A wide gap and a 1px `separator` outline on a base-surface ground.          |
| `tint`     | A per-cell hue panel around each clip (the hue ramps' `-bg` fills).         |

## Frames and renders

All outputs are under the gitignored `temp/grid-variants/`:

- `<story>-<theme>-<time>.png` and `<story>-contact.png`: one row per theme. Variant 1 and the console are shot at
  the start, zoomed out, mid-shift, landed, the second cycle, the montage and the end. The reveal variants are shot
  at the start, mid-pan, mid-cut, 2s, 6s and the end of the reveal.
- `console/`: the console's frames and contact sheets.
- `borders/borders-contact.png`: the zoomed-out 3x3 of `shift-clips` for each border. Columns are none, gutter, card,
  mat, bezel and hairline, then tint. The rows are light and dark. `borders/borders-mid.png` shows `card` and `bezel`
  mid-zoom and mid-shift.
- `shift-clips-preview.mp4`, `console-clips-preview.mp4`: 60s renders at 1x and 30fps, with no audio.
