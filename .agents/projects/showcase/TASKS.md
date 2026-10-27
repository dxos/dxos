# Showcase — Tasks

_Resume: run `node tools/autocue/showcase/overnight.mjs` and fix the flows its REPORT.md frames show broken (Phase 4). Uncommitted: none. Last: per-plugin showcase flows + overnight runner._

## Phase 1: Grid montage (PR #14026)

A 6x6 grid of Composer plugin clips under one camera: tour three demos at full frame, slide between them at constant
zoom, zoom out to the whole grid. Rendered frame by frame at 60 fps.

### Tasks

- [x] **`interpolateCamera`** — pure zoom-and-pan path in `react-ui-canvas` `camera.ts`, with tests and a changeset.
- [x] **Grid story** — tour cells, constant-zoom slides, zoom-out; stepped mode for frame-exact rendering.
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
- [x] **Grid empty tour** — falls back to the default tour.
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
- [x] **Grid layout** — `layout.mjs` places the light clips so a repeat is never near itself (swap pass on a greedy
      fill; 3 cells is the floor in a 6x6 grid's centre) and fails under 3; the runner calls it and maps the grid in
      REPORT.md.
- [x] **Publish** — `--publish` uploads each flow's light and dark videos and sets the plugin's showcase entry in
      `dx.config.ts` `screenshots` (`screenshots.mjs`); one 1Password approval via `op run`.
- [x] **Composite** — after the layout, the runner renders Grid from the storybook on :9009 (starting one scoped to tools/autocue if none answers) (retrying once).
- [x] **SHOWCASE.md** moved to `tools/autocue/showcase`.
- [x] **Grid story** moved to `tools/autocue/src/components/Grid` (story id `tools-autocue-grid--default`);
      react-ui-canvas keeps `interpolateCamera` and the camera utilities it imports.
- [x] **First full run** — 22/26; canvas never left Home, projects opened Settings, uml had no `palette-class`: fixed.
- [ ] **illustrator** — an empty svg drawing renders blank; the clip needs a drawing with content (e.g. `dx drawing`).
- [ ] **script** — creating a Script neither opens a dialog nor navigates; find how it is created.
- [x] **Overnight run** (`temp/showcase/overnight`, 77 min): 48/52 videos; grid from 24 clips (closest repeat 4 cells);
      composite rendered (`temp/composite/composite.mp4`).
- [ ] **Publish the overnight run** — every upload failed: the cached keys were `<concealed by 1Password>` because
      `op run` masks printed secrets. Re-cache with `op run --no-masking` (command in `publish.mjs`), then
      `node tools/autocue/showcase/publish.mjs --run temp/showcase/overnight`; commit the 24 `dx.config.ts` changes.
- [ ] **Real gestures for the 8 static clips** — frames show nothing happening: board (empty board), code (empty
      project), conductor (empty circuit), kanban ("select a pivot column"), sequencer (empty grid), table (empty table),
      voxel (empty world), spacetime (the cube does not turn: orbit drag misses or needs a modifier).
- [ ] **script** — the Create Script dialog needs a Template; with one chosen, Create closes the dialog but no object
      appears and nothing navigates (probe: forex template). Looks like an app bug; confirm before writing the flow.
- [ ] **illustrator** — a new svg drawing renders blank, so the palette clicks time out; the clip needs a drawing with
      content.
- [ ] **Next full run** — read REPORT.md frames; fix every flow whose clip is blank or wrong.
- [ ] **Refine first-pass gestures** — sequencer, conductor, kanban, table, board, script, code, uml click across the
      plank; give each a gesture that shows the plugin working.
- [ ] **excalidraw spec** — plugin-excalidraw has no `PLUGIN.mdl`, so its flow names no test.
- [x] **Template for magazine** — Reading Room (`plugin-magazine/src/samples/reading-room`): 3 feeds × 10 posts with
      Unsplash hero images and article bodies, and a curated Weekend Reading magazine; flow `autocue/showcase.mjs` (QA-3).
- [ ] **Template for trip** — a sample space seeding an itinerary; then its flow.
- [ ] **Calls and inbox from Alien Labs** — #14021's template seeds mail; add a meeting record for calls, then
      their flows.
- [ ] **Grid timing** — the story assumes ~10s tour cells and 5s grid cells; clips are now 20s and 10s.

## Phase 5: Grid from hand-recorded clips

Three 20s tour shots and ~30 short shots recorded in Screen Studio, assembled into the Grid composite.

### Tasks

- [x] **Recording checklist** — SHOWCASE.md "Recording by hand": Composer, `chrome.sh` (app window, 1920x1080 page,
      no address bar), Screen Studio settings, export, assembly.
- [x] **Shot list** — `MANIFEST.md` in `/Volumes/SSD1/Media/Showcase/2026-10-17`: 3 tours, 30 grid shots.
- [x] **assemble.mjs** — normalizes the folder to 1080p60 (screenshots become 3s stills), lays out the grid with
      `tour-1..3` as tours, renders with a 20s hold (`render.mjs --hold`), writes `composite.mp4` to the folder.
- [ ] **Record the shots** (user), then run `assemble.mjs --clips /Volumes/SSD1/Media/Showcase/2026-10-17`.

## Phase 6: Narration and the recording plugin

### Tasks

- [ ] **Record the ECHO voice-over** with the prompter (`temp/voice`, script in `tools/autocue/showcase/docs/ECHO.md`,
      synced by `tools/autocue/showcase/cues.mjs`); lay the take on `ECHO.m4v`, freezing the picture at each logged hold.
- [ ] **Re-render the ECHO animation to the voice's timings** (later; the stretched cut ships first). The animation is
      the Flow story in the `data-molecule-animation` worktree
      (`packages/plugins/plugin-canvas/src/samples/molecules/Flow.stories.tsx`, fixed-length chapters), rendered by
      `packages/ui/react-ui-canvas/scripts/render-story.mjs --story plugins-plugin-canvas-samples-flow--default
--seconds 60 --fps 60`. Slowing a section in the edit (`voice-mux.mjs`) duplicates frames; a re-render keeps
      every motion at full rate.
  1. Take the chapter lengths from the final take's `sections` (`temp/voice/echo-<time>.json`, `seconds` per
     section, plus `--extra-last`): for take `echo-20261026-021700` they are 13.9, 13.7, 18.4, 17.3 and 18.7s.
  2. Make the Flow story's chapter lengths a story arg (an array of seconds), defaulting to today's, so a render can
     pass them without editing the story; keep the pan's speed ramps proportional to each chapter.
  3. Render at those lengths (`--seconds` = their sum) and check each chapter boundary against the take's speech gaps
     (`silencedetect`), as for the stretched cut.
  4. Add the DXOS open (3s) and the end card (2.6s) from `tools/ident` back around it, matching `ECHO.m4v`.
  5. Lay the voice on with `voice-mux.mjs` and no fit (sections already match), normalize to -16 LUFS, and compare it
     with the stretched cut before replacing it.
- [ ] **Record the Composer demo voice-over** the same way (`docs/COMPOSER.md`, `docs/cues/composer.json`).
- [ ] **Composite**: the voiced ECHO video, then the voiced Composer demo, one DXOS end card.
- [ ] **Email Brad** with the composite (needs his address; attachments over Gmail's 25MB limit need compressing).
- [ ] **Recording plugin**: a Composer plugin that works with plugin-studio to record audio and video — the prompter's
      gated playback, holds, mic picker and level meter, as a plugin. After the recordings are done.

## Phase 3: Open issues

### Tasks

- [x] **Spacetime story fixed** — `withTheme` for translations; the story adds its cube; the canvas's first build waits
      for scene refs to load, so a reopened scene no longer shows empty.
- [ ] **Spacetime places new objects at the origin** — added objects overlap the default cube.
- [ ] **Reading-list flow fails at "Add rows"** — every run; the table clip is cut from the column step instead.
- [ ] **`ScrollArea` collapses fit-content parents** — its `container-type: inline-size` gives no intrinsic width.
- [ ] **Remotion render** — frame-lock the tiles' own clips (today only the camera is frame-exact).
- [ ] **MessageArticle: summary above the stack** — move the conversation summary out of the `ConversationStack`
      scroll content to the top of the article, outside the message stack.
- [ ] **Inbox virtual list: uniform slot heights** — seen once: every tile placed at ~265px, so short tiles leave a gap
      and tall ones are overlapped. Not reproduced over 6 scroll positions and 3 resizes; suspected stale virtualizer
      sizes after `Stack.tsx` hot-reloaded. Needs a repro on a fresh load.

### References

- PR: https://github.com/dxos/dxos/pull/14026
- Rules and script table: `tools/autocue/showcase/docs/SHOWCASE.md`
