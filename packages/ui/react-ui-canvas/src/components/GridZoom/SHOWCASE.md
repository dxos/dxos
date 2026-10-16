# GridZoom showcase

The [GridZoom story](GridZoom.stories.tsx) plays a 6x6 grid of Composer clips under one camera. It focuses each
tour cell in turn (about 10s each), slides right between them at constant zoom, then zooms out until the whole grid
fits, with the last tour cell in the bottom-left quadrant.

Clips are read from the gitignored `temp/grid-zoom/` at the repo root: `tour-<n>.mp4` for the tour cells and
`clip-<NN>.mp4` (row-major index) for every other cell.

## Recording it

[`composer-app/autocue/showcase`](../../../../../apps/composer-app/autocue/showcase) holds the showcase flow and the
scripts that turn it into the montage. With Composer on :4173 and this story's storybook on :9015
(`DX_STORIES=ui/react-ui-canvas`), one command re-records everything:

```bash
packages/apps/composer-app/autocue/showcase/pipeline.sh
```

It records the showcase flow (`flow.mjs`, one 5s clip per plugin) and the committed flows (`committed.sh`), cuts the
clips into `temp/showcase/clips`, lays out `temp/grid-zoom`, and renders the composite to `temp/composite/composite.mp4` with `render.mjs`.

The three tour demos are 10s cuts from the busiest step of these flows (the markdown cut starts 2s in, so it opens on
text):

1. plugin-markdown `write-and-link`: "Write in markdown".
2. plugin-canvas `draw-and-nest`: "Draw and label shapes".
3. plugin-projects `plan-a-project`: "Break the work into tasks".

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
8. **Near-black between tiles.** The grid's ground and gutters are near black, in either theme.
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
`/iframe.html?id=ui-react-ui-canvas-gridzoom--default&viewMode=story&args=controls:!false;stepped:!true&globals=theme:light`.
Clips inside the tiles are live recordings, so their own motion runs at the screencast's rate.

Clips are recorded headless with `--gpu on`, so 3D plugins render on the GPU, and without the action feed
(`--overlay off`) or captions.

## Autocue scripts

Every autocue script under `packages/apps/composer-app` and `packages/plugins`, and the showcase clips cut from it. A row with no file is a plugin the showcase wants a flow for. Rows are sorted by plugin.

| Plugin                  | File                                                                                                        | Shows                                                                                       | Light                                                                                    | Dark                                                                                          | Showcase clips                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------- |
| composer-app            | [composer-basics.mjs](../../../../../apps/composer-app/autocue/composer-basics.mjs)                         | A tour of the default space: comment on the README, write and link a document.              | —                                                                                        | —                                                                                             | —                                  |
| composer-app            | [two-peer-collaboration.mjs](../../../../../apps/composer-app/autocue/two-peer-collaboration.mjs)           | Alice and Bob share a space by invitation and write one document together.                  | —                                                                                        | —                                                                                             | —                                  |
| composer-app            | [desktop-input.mjs](../../../../../apps/composer-app/autocue/desktop-input.mjs)                             | The desktop app's input paths: a plugin toggle and a menu dismissed by an outside click.    | —                                                                                        | —                                                                                             | —                                  |
| plugin-agent            | [agent-identities.mjs](../../../../../plugins/plugin-agent/autocue/agent-identities.mjs)                    | Turn on agent identities and add an agent, end to end.                                      | —                                                                                        | —                                                                                             | —                                  |
| plugin-board            | —                                                                                                           | Card boards.                                                                                | —                                                                                        | —                                                                                             | —                                  |
| plugin-calls            | —                                                                                                           | Video and audio calls.                                                                      | —                                                                                        | —                                                                                             | —                                  |
| plugin-canvas           | [draw-and-nest.mjs](../../../../../plugins/plugin-canvas/autocue/draw-and-nest.mjs)                         | Draw and label shapes, connect them, and nest a detail scene inside a frame.                | —                                                                                        | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-canvas.mp4?v=5b3598bd)     | canvas-shapes, canvas-nest         |
| plugin-canvas           | [composer-uml.mjs](../../../../../plugins/plugin-canvas/autocue/composer-uml.mjs)                           | An architecture diagram of composer-app, with nested scenes for the plugins and the client. | —                                                                                        | [2026-10-10](https://assets.composer.space/demos/2026-10-10-plugin-canvas-uml.mp4?v=b7c7aa13) | uml-top, uml-nested                |
| plugin-chess            | [play-the-opening.mjs](../../../../../plugins/plugin-chess/autocue/play-the-opening.mjs)                    | Create a game, play 1. e4 e5 2. Nf3 by dragging, and watch an illegal move be refused.      | [2026-10-16](https://assets.composer.space/demos/2026-10-16-plugin-chess.mp4?v=036db780) | —                                                                                             | —                                  |
| plugin-claude           | [claude-code-task.mjs](../../../../../plugins/plugin-claude/autocue/claude-code-task.mjs)                   | Assign a project task to Claude Code on this computer and drive it from Composer.           | —                                                                                        | —                                                                                             | —                                  |
| plugin-claude           | [claude-code-cloud-task.mjs](../../../../../plugins/plugin-claude/autocue/claude-code-cloud-task.mjs)       | Delegate a project task to Claude Code (cloud), which opens and closes a pull request.      | —                                                                                        | —                                                                                             | —                                  |
| plugin-claude           | [claude-code-cloud-pr.mjs](../../../../../plugins/plugin-claude/autocue/claude-code-cloud-pr.mjs)           | A standalone Claude Code (cloud) chat opens a draft pull request and closes it on request.  | —                                                                                        | —                                                                                             | —                                  |
| plugin-computer         | [composer-plugin.mjs](../../../../../plugins/plugin-computer/autocue/composer-plugin.mjs)                   | An agent works the Composer Plugin template's tasks to write the World Clock plugin.        | —                                                                                        | —                                                                                             | —                                  |
| plugin-conductor        | —                                                                                                           | Conductor.                                                                                  | —                                                                                        | —                                                                                             | —                                  |
| plugin-explorer         | —                                                                                                           | Data visualization.                                                                         | —                                                                                        | —                                                                                             | —                                  |
| plugin-illustrator      | [dx-drawing.mjs](../../../../../plugins/plugin-illustrator/autocue/dx-drawing.mjs)                          | Lay out a diagram with `dx drawing`, re-flow it, and import the SVG into a space.           | —                                                                                        | —                                                                                             | —                                  |
| plugin-inbox            | —                                                                                                           | Email inbox.                                                                                | —                                                                                        | —                                                                                             | —                                  |
| plugin-kanban           | —                                                                                                           | Kanban boards.                                                                              | —                                                                                        | —                                                                                             | —                                  |
| plugin-magazine         | —                                                                                                           | RSS and open-protocol subscriptions.                                                        | —                                                                                        | —                                                                                             | —                                  |
| plugin-map              | —                                                                                                           | Maps.                                                                                       | —                                                                                        | —                                                                                             | —                                  |
| plugin-markdown         | [write-and-link.mjs](../../../../../plugins/plugin-markdown/autocue/write-and-link.mjs)                     | Write with live formatting, comment on a phrase, and link a new page.                       | —                                                                                        | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-markdown.mp4?v=797e74c3)   | markdown-write, markdown-checklist |
| plugin-meeting-recorder | [meeting-recorder.mjs](../../../../../plugins/plugin-meeting-recorder/autocue/meeting-recorder.mjs)         | A call takes the microphone and Composer offers to take meeting notes.                      | —                                                                                        | —                                                                                             | —                                  |
| plugin-mermaid          | —                                                                                                           | Mermaid diagrams.                                                                           | —                                                                                        | —                                                                                             | —                                  |
| plugin-projects         | [plan-a-project.mjs](../../../../../plugins/plugin-projects/autocue/plan-a-project.mjs)                     | Create a project, brief its agent, break the work into tasks, and select tasks for it.      | —                                                                                        | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-projects.mp4?v=30bb87a3)   | project-tasks                      |
| plugin-projects         | [composer-plugin-registry.mjs](../../../../../plugins/plugin-projects/autocue/composer-plugin-registry.mjs) | The assistant builds World Clock and publishes it to the private plugin registry.           | —                                                                                        | —                                                                                             | —                                  |
| plugin-projects         | [composer-plugin-desktop.mjs](../../../../../plugins/plugin-projects/autocue/composer-plugin-desktop.mjs)   | The Composer Plugin demo in the desktop app, built in a local sandbox.                      | —                                                                                        | —                                                                                             | —                                  |
| plugin-sequencer        | —                                                                                                           | Music sequencer with a step grid.                                                           | —                                                                                        | —                                                                                             | —                                  |
| plugin-sheet            | [budget.mjs](../../../../../plugins/plugin-sheet/autocue/budget.mjs)                                        | Enter a budget, total it with SUM, and change a value to watch the totals recompute.        | —                                                                                        | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-sheet.mp4?v=f7e67bab)      | sheet-budget                       |
| plugin-sheet            | [sales-charts.mjs](../../../../../plugins/plugin-sheet/autocue/sales-charts.mjs)                            | Create the Bramble Coffee Roasters space from its template and chart its sales report.      | [2026-10-16](https://assets.composer.space/demos/2026-10-16-plugin-sheet.mp4?v=bc00ceef) | —                                                                                             | —                                  |
| plugin-spacetime        | [build-a-scene.mjs](../../../../../plugins/plugin-spacetime/autocue/build-a-scene.mjs)                      | Create a scene, add a sphere and two vehicle presets from the templates, and orbit it.      | —                                                                                        | —                                                                                             | —                                  |
| plugin-studio           | —                                                                                                           | Image creation.                                                                             | —                                                                                        | —                                                                                             | —                                  |
| plugin-table            | [reading-list.mjs](../../../../../plugins/plugin-table/autocue/reading-list.mjs)                            | Add a typed number column, enter rows, and sort by that column.                             | —                                                                                        | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-table.mp4?v=7bd261d8)      | table-column                       |
| plugin-terra            | [planet.mjs](../../../../../plugins/plugin-terra/autocue/planet.mjs)                                        | Create a planet, spin it, and reshape it live from its seed and sliders.                    | [2026-10-16](https://assets.composer.space/demos/2026-10-16-plugin-terra.mp4?v=6687a7c1) | —                                                                                             | —                                  |
| plugin-terra            | [tour-the-views.mjs](../../../../../plugins/plugin-terra/autocue/tour-the-views.mjs)                        | Add five objects, show the gizmos, rotate and zoom, and tour the 3D, map and camera views.  | —                                                                                        | —                                                                                             | —                                  |
| plugin-trip             | —                                                                                                           | Travel itineraries.                                                                         | —                                                                                        | —                                                                                             | —                                  |
| plugin-voxel            | —                                                                                                           | 3D voxel editor.                                                                            | —                                                                                        | —                                                                                             | —                                  |

The other showcase clips (map, terra, spacetime, voxel, explorer, sheet, mermaid, markdown, presenter, tldraw,
excalidraw, canvas, outline, journal, registry, chess, handpan, project) come from the uncommitted showcase flow in
`temp/showcase/flow.mjs`, one 5s clip per plugin.
