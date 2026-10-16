# Showcase — Tasks

_Resume: record the Terra-views and Spacetime videos (light clip + dark demo), upload, link; then the phase 3 issues. Uncommitted: none. Last: #14027 merged into `claude/resume-project-showcase-530da1`; SHOWCASE.md light/dark split._

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
- [x] **Open the follow-up PR** — #14027.
- [ ] **Record and upload the Terra views and Spacetime videos** — a light showcase clip and a dark demo each (rules
      in `SHOWCASE.md`); link the dark demo from `dx.config.ts` and SHOWCASE.md. The earlier trims were lost with the
      old worktree; R2 keys now come from the root `.secrets/r2.env`, so no 1Password prompt.
- [x] **SHOWCASE.md table** — plugin and file columns; Light and Dark video columns.
- [x] **SHOWCASE.md rules** — light showcase clips (60 fps, no ident, no captions); dark demos (30 fps, ident and
      outro, captions).
- [ ] **Re-record the light published demos in dark** — chess `play-the-opening`, terra `planet` and sheet
      `sales-charts` were published in light, so the Dark column has no demo for them.
- [ ] **Re-record the showcase clips** with the Terra fixes and the markdown flow's list fix; name the mermaid document.

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
