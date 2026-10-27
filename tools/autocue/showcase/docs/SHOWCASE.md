# Grid showcase

The [Grid story](../../src/components/Grid/Grid.stories.tsx) plays a 6x6 grid of Composer clips under one camera. It focuses each
tour cell in turn (about 10s each), slides right between them at constant zoom, then zooms out until the whole grid
fits, with the last tour cell in the bottom-left quadrant.

Clips are read from the gitignored `temp/grid-zoom/` at the repo root: `tour-<n>.mp4` for the tour cells and
`clip-<NN>.mp4` (row-major index) for every other cell.

Alternative transitions (the shift loop, the Composer console, and others that never frame more than 3x3) are
prototyped as sibling stories; see [GRID-TRANSITIONS.md](../GRID-TRANSITIONS.md). `render.mjs --story <id>` renders any of
them.

## Recording by hand

The grid can also be built from clips recorded by hand in Screen Studio: three 20s tour shots and about 30 short
(3s) shots or screenshots. The shot list for a session lives in its folder as `MANIFEST.md` (for example
`/Volumes/SSD1/Media/Showcase/2026-10-17/MANIFEST.md`); `assemble.mjs` turns the folder into the composite.

### Tasks

- [ ] **Run Composer** from this worktree: `moon run composer-app:serve` (http://localhost:5173), signed in, light
      theme (Settings › Appearance), the notices dismissed, and the plugins in the shot list enabled.
- [ ] **Pin the page size** to exactly **1920x1080 at 2x**, the same as the automated recordings, in your usual
      Chrome profile (your signed-in Composer and its spaces), without opening DevTools:
  - Once: open `chrome://extensions`, turn on Developer mode, _Load unpacked_ and pick
    `tools/autocue/showcase/pin-extension`; pin its button to the toolbar.
  - On the Composer tab, click **Showcase Pin**: the badge reads ON and the page lays out at 1920x1080 in the top-left
    of the window, so the window's rounded corners and edge fall outside it. Click again to release.
  - Chrome shows a "started debugging this browser" banner above the page while it is pinned; it sits outside the
    page but moves it down, so set the crop's top from the page's top edge with the banner showing.
  - Without the extension, `node tools/autocue/showcase/pin.mjs --url <composer url>` does the same in a separate,
    persistent profile (`~/.dxos/showcase-chrome`) with no banner.
- [ ] **Set up Screen Studio** (once per session):
  - Record the window and crop to **1920x1080 at the page's top-left** (below the tab strip, address bar and, with
    the extension, its banner). On a 2x display that captures the page at 3840x2160, as autocue does.
  - Background: _None_ (no wallpaper), padding 0, corner radius 0, shadow off, inset 0, so the export is the app only.
  - Cursor: small size, click effects off; hide it for screenshots. Auto-zoom: off for grid shots (a tile is too small
    to read a zoom); optional and subtle for the tour shots.
  - No camera, microphone or system audio.
- [ ] **Record each shot** in `MANIFEST.md`: start each from a settled screen (no dialogs, toasts or companions
      opening on camera), one continuous gesture, then trim in Screen Studio to exactly 20s (tours) or 3s (grid).
- [ ] **Export** each as MP4, 1080p (1920x1080), 60 fps, high quality, named as in `MANIFEST.md` (`tour-1.mp4`,
      `map.mp4`, …); a screenshot is a PNG at 1920x1080 (`table.png`). Save into the session folder and tick the shot.
- [ ] **Assemble**: `node tools/autocue/showcase/assemble.mjs --clips <folder>`. It normalizes every file to
      1920x1080 at 60 fps (a screenshot becomes a 3s still clip), lays out the grid (`tour-1`..`tour-3` on the tour
      cells; other clips repeat only far from themselves), renders the composite from the Grid story with a 20s hold
      per tour, and writes `composite.mp4` back to the folder.
  - Any number of tours, `tour-1`..`tour-<n>`, sit side by side in row 3; the camera pans right from each to the next.
  - `--full` holds each tour for its whole clip; `--overlap <ms>` starts the zoom-out that long before the last tour
    ends, so it plays on as the grid is revealed; `--zoom <ms>` sets the zoom-out's length.
  - `--reuse-tours` lets the tour clips fill grid cells too when there are few other clips, `--once a,b` places those
    clips in one cell only, `--pin <clip>@<col>,<row>` fixes a clip to a cell, and `--min` sets how close two copies
    may sit.
  - `--supersample 2` renders each frame at twice the pixel density and area-averages it down, so tiles do not alias
    during the zoom-out (about twice the render time).
  - The 2026-10-18 session: `--full --overlap 73083 --zoom 15000 --reuse-tours --once map,spacetime --pin explorer@3,2
--min 2 --supersample 2` (the zoom starts 2s into meeting, with explorer above it).

## Recording it

Every showcase clip is its own flow: `autocue/showcase.mjs` in the plugin's package (composer-app's lives in
`packages/apps/composer-app/autocue`), with a "Showcase clip" test in the plugin's `PLUGIN.mdl`. Each flow is a
prep step, an off-camera setup step, and one `clip: <name>` step held to the flow's `CLIP_MS`: 20s for the tour cells
(composer-app, markdown, canvas, projects) and 10s for every grid cell. The shared steps and gestures are in
[`tools/autocue/showcase/steps.mjs`](../steps.mjs).

One command records them all unattended, so it can run overnight:

```bash
node tools/autocue/showcase/overnight.mjs
```

It starts Composer on :4173 if nothing answers there and records each flow twice (retrying a failed take once):

1. **Light**, the showcase clip: the `clip:` step cut to the flow's `CLIP_MS`, at 60 fps, to
   `temp/showcase/<run>/clips/light/<name>.mp4`.
2. **Dark**, the demo: the whole take at 30 fps with the clip's caption, trimmed of dead air and bookended by the
   Composer ident and end card, to `clips/dark/<name>.mp4`. It is not uploaded; upload the ones you keep.

At the end it lays the light clips out as the grid in `temp/grid-zoom` with
[`layout.mjs`](../layout.mjs): markdown, canvas and projects on the tour cells
(`--tour` to change them), and every other cell taking the clip whose nearest copy is farthest away, so a clip never
repeats beside or near itself. It fails when two copies land closer than 3 cells. Run it on its own with
`node tools/autocue/showcase/layout.mjs --run temp/showcase/<run>`.

Then it renders the Grid composite from the laid-out grid with [`render.mjs`](../render.mjs), frame by frame at 60 fps,
to `<run>/composite.mp4` and `temp/composite/composite.mp4`. It serves the story from a storybook scoped to
`tools/autocue` on :9009 (the one storybook, reused when it is up), starting one if nothing answers there and stopping it afterwards; `--no-composite`
skips the render.

With `--publish` (R2 keys from the environment, or cached once per session from 1Password into the gitignored
`.secrets/r2.env`; `publish.mjs`'s header has the command, which needs `op run --no-masking`), each flow whose two videos
pass is uploaded and set as its plugin's showcase entry in `dx.config.ts` `screenshots`, replacing the previous run's.
A finished run is published later, without re-recording, by `node tools/autocue/showcase/publish.mjs --run temp/showcase/<run>`.

`REPORT.md` has a pass/fail row and four frames per video, the grid's map, and frames from the composite. A step can pass on a blank plank, so check the frames,
not just the result. `--only map,chess` records a subset, `--themes light` one variant, and `--no-serve` uses the
running server only.

Three flows start from a space template: composer-app from Bramble Coffee Roasters (plugin-onboarding), canvas
from DXOS Architecture (plugin-canvas), and projects from Chess MCP on Workers (plugin-debug, which the flow enables).

[`render.mjs`](../render.mjs) renders the composite from this story once
the clips are laid out in `temp/grid-zoom`.

## Recording rules

Each flow is recorded two ways: in light mode as a showcase clip (the Light column below), and in dark mode as a
standalone demo video (the Dark column).

### Showcase clips (light)

Every showcase clip and every take of the composite follows these:

1. **Light mode.** Run the autocue driver with `--theme light`.
2. **60 fps.** Run the driver with `--fps 60`, and encode the cut clips and the composite at 60 fps.
3. **No ident.** Run `trim-static.mjs` (if at all) without `--ident`, `--intro` or `--outro`: no opening title and no
   end card.
4. **No captions or titles.** Run the driver with `--captions off`, so a flow's step captions never appear.
5. **No count-in.** Run the flow with `"countdown": false` (as `run.sh` does), so the 3-2-1 countdown never plays.
6. **The navtree shows.** Record clips at 1920x1080 and keep the whole app frame, sidebar included; never crop to the
   plank.
7. **Full resolution.** Record at `--scale 2` and encode every clip at 1920x1080, so a tour cell filling the frame is
   shown 1:1 rather than upscaled.
8. **Themed ground.** The grid's ground and gutters follow the story's theme global (light for the composite), and
   `assemble.mjs` letterboxes a clip that is not 16:9 in the theme's page colour (`--theme`).
9. **Render the composite frame by frame.** `render.mjs` seeks the story's stepped mode and screenshots each frame at
   exactly 60 fps. A live screencast of the story delivers about 25 fps at 1080p, so camera moves judder.

### Demo videos (dark)

Every standalone demo video follows these:

1. **Dark mode.** Run the autocue driver with `--theme dark`.
2. **30 fps.** Run the driver with `--fps 30`, and encode the MP4 at 30 fps.
3. **Ident and outro.** Trim with `trim-static.mjs --ident composer`, which opens on the Composer title and closes on
   the end card.
4. **Captions.** Run the driver with `--captions on`, so each step's caption shows.
5. **Uploaded.** The trimmer uploads the MP4 to `assets.composer.space`; link it from the plugin's `dx.config.ts` and
   the Dark column below.

The composite is rendered from the story in isolation, stepped, with the controls hidden and the light theme:
`/iframe.html?id=tools-autocue-grid--default&viewMode=story&args=controls:!false;stepped:!true&globals=theme:light`.
Clips inside the tiles are live recordings, so their own motion runs at the screencast's rate.

Clips are recorded headless with `--gpu on`, so 3D plugins render on the GPU, and without the action feed
(`--overlay off`) or captions.

## Autocue scripts

Every autocue script under `packages/apps/composer-app` and `packages/plugins`, one row per script. **Light** and **Dark** link the script's published standalone demo videos; **Showcase clip** names the plugin's `showcase.mjs` flow, which records the montage clip. A blank cell is about that row's script only: a plugin with several rows may have its showcase clip on another row, and a plugin waiting for one has no row with it. Rows are sorted by plugin.

| Plugin                  | File                                                                                                              | Shows                                                                                       | Light                                                                                                | Dark                                                                                           | Showcase clip                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| composer-app            | [composer-basics.mjs](../../../../packages/apps/composer-app/autocue/composer-basics.mjs)                         | A tour of the default space: comment on the README, write and link a document.              | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/apps/composer-app/autocue/showcase.mjs) (20s)          |
| composer-app            | [two-peer-collaboration.mjs](../../../../packages/apps/composer-app/autocue/two-peer-collaboration.mjs)           | Alice and Bob share a space by invitation and write one document together.                  | —                                                                                                    | —                                                                                              | —                                                                                          |
| composer-app            | [desktop-input.mjs](../../../../packages/apps/composer-app/autocue/desktop-input.mjs)                             | The desktop app's input paths: a plugin toggle and a menu dismissed by an outside click.    | —                                                                                                    | —                                                                                              | —                                                                                          |
| plugin-agent            | [agent-identities.mjs](../../../../packages/plugins/plugin-agent/autocue/agent-identities.mjs)                    | Turn on agent identities and add an agent, end to end.                                      | —                                                                                                    | —                                                                                              | —                                                                                          |
| plugin-board            | —                                                                                                                 | Card boards.                                                                                | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-board/autocue/showcase.mjs) (10s)       |
| plugin-calls            | —                                                                                                                 | Video and audio calls.                                                                      | —                                                                                                    | —                                                                                              | —                                                                                          |
| plugin-canvas           | [draw-and-nest.mjs](../../../../packages/plugins/plugin-canvas/autocue/draw-and-nest.mjs)                         | Draw and label shapes, connect them, and nest a detail scene inside a frame.                | —                                                                                                    | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-canvas.mp4?v=5b3598bd)      | [showcase.mjs](../../../../packages/plugins/plugin-canvas/autocue/showcase.mjs) (20s)      |
| plugin-canvas           | [composer-uml.mjs](../../../../packages/plugins/plugin-canvas/autocue/composer-uml.mjs)                           | An architecture diagram of composer-app, with nested scenes for the plugins and the client. | —                                                                                                    | [2026-10-10](https://assets.composer.space/demos/2026-10-10-plugin-canvas-uml.mp4?v=b7c7aa13)  | uml-top, uml-nested                                                                        |
| plugin-chess            | [play-the-opening.mjs](../../../../packages/plugins/plugin-chess/autocue/play-the-opening.mjs)                    | Create a game, play 1. e4 e5 2. Nf3 by dragging, and watch an illegal move be refused.      | [2026-10-16](https://assets.composer.space/demos/2026-10-16-plugin-chess.mp4?v=036db780)             | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-chess/autocue/showcase.mjs) (10s)       |
| plugin-claude           | [claude-code-task.mjs](../../../../packages/plugins/plugin-claude/autocue/claude-code-task.mjs)                   | Assign a project task to Claude Code on this computer and drive it from Composer.           | —                                                                                                    | —                                                                                              | —                                                                                          |
| plugin-claude           | [claude-code-cloud-task.mjs](../../../../packages/plugins/plugin-claude/autocue/claude-code-cloud-task.mjs)       | Delegate a project task to Claude Code (cloud), which opens and closes a pull request.      | —                                                                                                    | —                                                                                              | —                                                                                          |
| plugin-claude           | [claude-code-cloud-pr.mjs](../../../../packages/plugins/plugin-claude/autocue/claude-code-cloud-pr.mjs)           | A standalone Claude Code (cloud) chat opens a draft pull request and closes it on request.  | —                                                                                                    | —                                                                                              | —                                                                                          |
| plugin-code             | —                                                                                                                 | Open a new code project.                                                                    | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-code/autocue/showcase.mjs) (10s)        |
| plugin-dev-shell        | [composer-plugin.mjs](../../../../packages/plugins/plugin-dev-shell/autocue/composer-plugin.mjs)                  | An agent works the Composer Plugin template's tasks to write the World Clock plugin.        | —                                                                                                    | —                                                                                              | —                                                                                          |
| plugin-conductor        | —                                                                                                                 | Conductor.                                                                                  | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-conductor/autocue/showcase.mjs) (10s)   |
| plugin-excalidraw       | —                                                                                                                 | Draw a few shapes in Excalidraw.                                                            | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-excalidraw/autocue/showcase.mjs) (10s)  |
| plugin-explorer         | —                                                                                                                 | Data visualization.                                                                         | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-explorer/autocue/showcase.mjs) (10s)    |
| plugin-handpan          | —                                                                                                                 | Play a melody around the handpan.                                                           | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-handpan/autocue/showcase.mjs) (10s)     |
| plugin-illustrator      | [dx-drawing.mjs](../../../../packages/plugins/plugin-illustrator/autocue/dx-drawing.mjs)                          | Lay out a diagram with `dx drawing`, re-flow it, and import the SVG into a space.           | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-illustrator/autocue/showcase.mjs) (10s) |
| plugin-inbox            | —                                                                                                                 | Email inbox.                                                                                | —                                                                                                    | —                                                                                              | —                                                                                          |
| plugin-kanban           | —                                                                                                                 | Kanban boards.                                                                              | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-kanban/autocue/showcase.mjs) (10s)      |
| plugin-magazine         | —                                                                                                                 | Browse the Reading Room template's curated magazine and open an article.                    | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-magazine/autocue/showcase.mjs) (10s)    |
| plugin-map              | —                                                                                                                 | Maps.                                                                                       | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-map/autocue/showcase.mjs) (10s)         |
| plugin-markdown         | [write-and-link.mjs](../../../../packages/plugins/plugin-markdown/autocue/write-and-link.mjs)                     | Write with live formatting, comment on a phrase, and link a new page.                       | —                                                                                                    | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-markdown.mp4?v=797e74c3)    | [showcase.mjs](../../../../packages/plugins/plugin-markdown/autocue/showcase.mjs) (20s)    |
| plugin-meeting-recorder | [meeting-recorder.mjs](../../../../packages/plugins/plugin-meeting-recorder/autocue/meeting-recorder.mjs)         | A call takes the microphone and Composer offers to take meeting notes.                      | —                                                                                                    | —                                                                                              | —                                                                                          |
| plugin-mermaid          | —                                                                                                                 | Mermaid diagrams.                                                                           | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-mermaid/autocue/showcase.mjs) (10s)     |
| plugin-presenter        | —                                                                                                                 | Present a document as slides and page through them.                                         | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-presenter/autocue/showcase.mjs) (10s)   |
| plugin-projects         | [plan-a-project.mjs](../../../../packages/plugins/plugin-projects/autocue/plan-a-project.mjs)                     | Create a project, brief its agent, break the work into tasks, and select tasks for it.      | —                                                                                                    | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-projects.mp4?v=30bb87a3)    | [showcase.mjs](../../../../packages/plugins/plugin-projects/autocue/showcase.mjs) (20s)    |
| plugin-projects         | [composer-plugin-registry.mjs](../../../../packages/plugins/plugin-projects/autocue/composer-plugin-registry.mjs) | The assistant builds World Clock and publishes it to the private plugin registry.           | —                                                                                                    | —                                                                                              | —                                                                                          |
| plugin-projects         | [composer-plugin-desktop.mjs](../../../../packages/plugins/plugin-projects/autocue/composer-plugin-desktop.mjs)   | The Composer Plugin demo in the desktop app, built in a local sandbox.                      | —                                                                                                    | —                                                                                              | —                                                                                          |
| plugin-script           | —                                                                                                                 | Open a new script.                                                                          | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-script/autocue/showcase.mjs) (10s)      |
| plugin-sequencer        | —                                                                                                                 | Music sequencer with a step grid.                                                           | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-sequencer/autocue/showcase.mjs) (10s)   |
| plugin-sheet            | [budget.mjs](../../../../packages/plugins/plugin-sheet/autocue/budget.mjs)                                        | Enter a budget, total it with SUM, and change a value to watch the totals recompute.        | —                                                                                                    | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-sheet.mp4?v=f7e67bab)       | [showcase.mjs](../../../../packages/plugins/plugin-sheet/autocue/showcase.mjs) (10s)       |
| plugin-sheet            | [sales-charts.mjs](../../../../packages/plugins/plugin-sheet/autocue/sales-charts.mjs)                            | Create the Bramble Coffee Roasters space from its template and chart its sales report.      | [2026-10-16](https://assets.composer.space/demos/2026-10-16-plugin-sheet.mp4?v=bc00ceef)             | —                                                                                              | —                                                                                          |
| plugin-spacetime        | [build-a-scene.mjs](../../../../packages/plugins/plugin-spacetime/autocue/build-a-scene.mjs)                      | Create a scene, add a sphere and two vehicle presets from the templates, and orbit it.      | [2026-10-16](https://assets.composer.space/demos/2026-10-16-plugin-spacetime-light.mp4?v=995ae0ca)   | [2026-10-16](https://assets.composer.space/demos/2026-10-16-plugin-spacetime.mp4?v=280c6044)   | [showcase.mjs](../../../../packages/plugins/plugin-spacetime/autocue/showcase.mjs) (10s)   |
| plugin-table            | [reading-list.mjs](../../../../packages/plugins/plugin-table/autocue/reading-list.mjs)                            | Add a typed number column, enter rows, and sort by that column.                             | —                                                                                                    | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-table.mp4?v=7bd261d8)       | [showcase.mjs](../../../../packages/plugins/plugin-table/autocue/showcase.mjs) (10s)       |
| plugin-tasks            | —                                                                                                                 | Write an outline of a launch plan.                                                          | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-tasks/autocue/showcase.mjs) (10s)       |
| plugin-terra            | [planet.mjs](../../../../packages/plugins/plugin-terra/autocue/planet.mjs)                                        | Create a planet, spin it, and reshape it live from its seed and sliders.                    | [2026-10-16](https://assets.composer.space/demos/2026-10-16-plugin-terra.mp4?v=6687a7c1)             | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-terra/autocue/showcase.mjs) (10s)       |
| plugin-terra            | [tour-the-views.mjs](../../../../packages/plugins/plugin-terra/autocue/tour-the-views.mjs)                        | Add five objects, show the gizmos, rotate and zoom, and tour the 3D, map and camera views.  | [2026-10-16](https://assets.composer.space/demos/2026-10-16-plugin-terra-views-light.mp4?v=8bf5dc36) | [2026-10-16](https://assets.composer.space/demos/2026-10-16-plugin-terra-views.mp4?v=e8bbc5da) | —                                                                                          |
| plugin-tldraw           | —                                                                                                                 | Draw a few shapes in tldraw.                                                                | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-tldraw/autocue/showcase.mjs) (10s)      |
| plugin-trip             | —                                                                                                                 | Travel itineraries.                                                                         | —                                                                                                    | —                                                                                              | —                                                                                          |
| plugin-uml              | —                                                                                                                 | Draw class shapes on a canvas.                                                              | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-uml/autocue/showcase.mjs) (10s)         |
| plugin-voxel            | —                                                                                                                 | 3D voxel editor.                                                                            | —                                                                                                    | —                                                                                              | [showcase.mjs](../../../../packages/plugins/plugin-voxel/autocue/showcase.mjs) (10s)       |

Each plugin's showcase clip comes from its own `autocue/showcase.mjs` (see Recording it).
