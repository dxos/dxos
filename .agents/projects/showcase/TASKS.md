# Showcase — Tasks

_Resume: run `node tools/autocue/showcase/overnight.mjs` and fix the flows its REPORT.md frames show broken (Phase 4). Uncommitted: none. Last: per-plugin showcase flows + overnight runner._

## Phase 1: GridZoom montage (PR #14026)

A 6x6 grid of Composer plugin clips under one camera: tour three demos at full frame, slide between them at constant
zoom, zoom out to the whole grid. Rendered frame by frame at 60 fps.

### Tasks

- [x] **`interpolateCamera`** — pure zoom-and-pan path in `react-ui-canvas` `camera.ts`, with tests and a changeset.
- [x] **GridZoom story** — tour cells, constant-zoom slides, zoom-out; stepped mode for frame-exact rendering.
- [x] **Showcase flow and scripts** — `composer-app/autocue/showcase/` (`flow.mjs`, `run.sh`, `cut.sh`, `cutstep.sh`,
      `committed.sh`, `pipeline.sh`, `render.mjs`); APP.mdl QA-13.
- [x] **Autocue `--gpu on`** — headless Chromium with the GPU, so 3D plugins render at full rate.
- [x] **Recording rules** — `SHOWCASE.md`: light mode, 60 fps, no ident/captions, navtree, 2x, near-black ground,
      frame-by-frame composite.
- [x] **Catalog** — `.agents/skills/autocue/DEMOS.md` lists every committed flow and its published video.

## Phase 2: Plugin flows and fixes (local, follow-up PR)

### Tasks

- [x] **Terra** — mid-gray backdrop in light mode; hide empty telemetry; telemetry a 30rem `react-ui-list` with
      up/down selection; selecting turns the globe; gizmo toggle beside the view tabs; camera-target picker removed;
      config panel top-left, FPS bottom-left.
- [x] **Terra flows** — `planet.mjs` (QA-1, published video) and `tour-the-views.mjs` (QA-2).
- [x] **Chess flow** — `play-the-opening.mjs` (QA-1, published video).
- [x] **Spacetime flow** — `build-a-scene.mjs` (QA-2).
- [x] **GridZoom empty tour** — falls back to the default tour.
- [x] **Open the follow-up PR** — #14027 (merged).
- [x] **Record and upload the Terra views and Spacetime videos** — light clip (60 fps) and dark demo (30 fps, ident,
      captions) each, linked from `dx.config.ts` and SHOWCASE.md. R2 keys resolve from `~/.env.tpl` via `op run`.
- [x] **SHOWCASE.md table** — plugin and file columns; Light and Dark video columns.
- [x] **SHOWCASE.md rules** — light showcase clips (60 fps, no ident, no captions); dark demos (30 fps, ident and
      outro, captions).
- [ ] **Write flows for the plugins without one** — board, calls, conductor, explorer, inbox, kanban, magazine, map,
      mermaid, sequencer, trip, voxel (rows in SHOWCASE.md with no file).
- [ ] **Re-record the light published demos in dark** — chess `play-the-opening`, terra `planet` and sheet
      `sales-charts` were published in light, so the Dark column has no demo for them.
- [ ] **Re-record the showcase clips** with the Terra fixes and the markdown flow's list fix; name the mermaid document.

## Phase 4: Per-plugin showcase flows, recorded overnight

Every showcase clip is its own `autocue/showcase.mjs` with a "Showcase clip" test in its spec, and
`tools/autocue/showcase/overnight.mjs` records them all unattended: 20s tour clips (composer-app, markdown, canvas,
projects) and 10s grid clips, light, 60 fps, no ident, captions or count-in. The tooling lives in `tools/autocue/showcase`
so it joins the `tools/autocue` package from #14028 when that lands.

### Tasks

- [x] **Shared steps** — `tools/autocue/showcase/steps.mjs`: prep, create (waits for the navigation to the new object),
      fromTemplate, editor, orbit, drag, scroll, and the fixed-length clip step.
- [x] **Overnight runner** — `overnight.mjs`: discovers flows, starts Composer if needed, retries once, cuts clips,
      writes REPORT.md with four frames per clip. Dry run: map, markdown, chess all pass with correct frames.
- [x] **26 flows and spec tests** — composer-app (Bramble), markdown, canvas (DXOS Architecture), projects (Chess MCP on
      Workers) at 20s; 22 plugins at 10s. The monolithic `flow.mjs`, `pipeline.sh`, `cut.sh`, `committed.sh` are gone.
- [x] **Light and dark variants** — each flow records a light clip (60 fps, cut) and a dark demo (30 fps, caption,
      ident and end card, not uploaded); each clip step carries the caption the dark demo shows.
- [ ] **First full overnight run** — read REPORT.md frames; fix every flow whose clip is blank or wrong.
- [ ] **Refine first-pass gestures** — sequencer, conductor, kanban, table, board, script, code, uml click across the
      plank; give each a gesture that shows the plugin working.
- [ ] **excalidraw spec** — plugin-excalidraw has no `PLUGIN.mdl`, so its flow names no test.
- [ ] **Template for magazine and trip** — a plugin-debug sample space seeding a feed with articles and an itinerary,
      built on #14021's partials once it lands; then their flows.
- [ ] **Calls and inbox from Fieldstone Labs** — #14021's template seeds mail; add a meeting record for calls, then
      their flows.
- [ ] **GridZoom timing** — the story assumes ~10s tour cells and 5s grid cells; clips are now 20s and 10s.

## Phase 3: Open issues

### Tasks

- [x] **Spacetime story fixed** — `withTheme` for translations; the story adds its cube; the canvas's first build waits
      for scene refs to load, so a reopened scene no longer shows empty.
- [ ] **Spacetime places new objects at the origin** — added objects overlap the default cube.
- [ ] **Reading-list flow fails at "Add rows"** — every run; the table clip is cut from the column step instead.
- [ ] **`ScrollArea` collapses fit-content parents** — its `container-type: inline-size` gives no intrinsic width.
- [ ] **Remotion render** — frame-lock the tiles' own clips (today only the camera is frame-exact).

### References

- PR: https://github.com/dxos/dxos/pull/14026
- Rules and script table: `packages/ui/react-ui-canvas/src/components/GridZoom/SHOWCASE.md`
