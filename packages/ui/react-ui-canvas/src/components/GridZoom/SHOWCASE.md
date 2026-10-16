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

Every clip and every take of the composite follows these:

1. **Light mode.** Run the autocue driver with `--theme light`.
2. **60 fps.** Run the driver with `--fps 60`, and encode the cut clips and the composite at 60 fps.
3. **The sequence only.** Run `trim-static.mjs` (if at all) without `--ident`, `--intro` or `--outro`: no opening
   title and no end card.
4. **No captions or titles.** Run the driver with `--captions off`, so a flow's step captions never appear.
5. **The navtree shows.** Record clips at 1920x1080 and keep the whole app frame, sidebar included; never crop to the
   plank.
6. **Full resolution.** Record at `--scale 2` and encode every clip at 1920x1080, so a tour cell filling the frame is
   shown 1:1 rather than upscaled.
7. **Near-black between tiles.** The grid's ground and gutters are near black, in either theme.
8. **Render the composite frame by frame.** `render.mjs` seeks the story's stepped mode and screenshots each frame at
   exactly 60 fps. A live screencast of the story delivers about 25 fps at 1080p, so camera moves judder.

The composite is rendered from the story in isolation, stepped, with the controls hidden and the light theme:
`/iframe.html?id=ui-react-ui-canvas-gridzoom--default&viewMode=story&args=controls:!false;stepped:!true&globals=theme:light`.
Clips inside the tiles are live recordings, so their own motion runs at the screencast's rate.

Clips are recorded headless with `--gpu on`, so 3D plugins render on the GPU, and without the action feed
(`--overlay off`) or captions.

## Autocue scripts

Every autocue script under `packages/apps/composer-app` and `packages/plugins`, and the showcase clips cut from it.

| Flow                                       | Shows                                                                                       | Video                                                                                         | Showcase clips                     | File                                                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| composer-app › composer-basics             | A tour of the default space: comment on the README, write and link a document.              | —                                                                                             | —                                  | [packages/apps/composer-app/autocue/composer-basics.mjs](../../../../../apps/composer-app/autocue/composer-basics.mjs)                               |
| composer-app › two-peer-collaboration      | Alice and Bob share a space by invitation and write one document together.                  | —                                                                                             | —                                  | [packages/apps/composer-app/autocue/two-peer-collaboration.mjs](../../../../../apps/composer-app/autocue/two-peer-collaboration.mjs)                 |
| composer-app › desktop-input               | The desktop app's input paths: a plugin toggle and a menu dismissed by an outside click.    | —                                                                                             | —                                  | [packages/apps/composer-app/autocue/desktop-input.mjs](../../../../../apps/composer-app/autocue/desktop-input.mjs)                                   |
| plugin-agent › two-people-one-agent        | Alice and Bob talk to one agent in private chats, and Bob's update reaches Alice.           | —                                                                                             | —                                  | [packages/plugins/plugin-agent/autocue/two-people-one-agent.mjs](../../../../../plugins/plugin-agent/autocue/two-people-one-agent.mjs)               |
| plugin-agent › agent-identities            | Turn on agent identities and add an agent, end to end.                                      | —                                                                                             | —                                  | on `main`                                                                                                                                            |
| plugin-canvas › draw-and-nest              | Draw and label shapes, connect them, and nest a detail scene inside a frame.                | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-canvas.mp4?v=5b3598bd)     | canvas-shapes, canvas-nest         | [packages/plugins/plugin-canvas/autocue/draw-and-nest.mjs](../../../../../plugins/plugin-canvas/autocue/draw-and-nest.mjs)                           |
| plugin-canvas › composer-uml               | An architecture diagram of composer-app, with nested scenes for the plugins and the client. | [2026-10-10](https://assets.composer.space/demos/2026-10-10-plugin-canvas-uml.mp4?v=b7c7aa13) | uml-top, uml-nested                | [packages/plugins/plugin-canvas/autocue/composer-uml.mjs](../../../../../plugins/plugin-canvas/autocue/composer-uml.mjs)                             |
| plugin-chess › play-the-opening            | Create a game, play 1. e4 e5 2. Nf3 by dragging, and watch an illegal move be refused.      | [2026-10-16](https://assets.composer.space/demos/2026-10-16-plugin-chess.mp4?v=036db780)      | —                                  | [packages/plugins/plugin-chess/autocue/play-the-opening.mjs](../../../../../plugins/plugin-chess/autocue/play-the-opening.mjs)                       |
| plugin-claude › claude-code-task           | Assign a project task to Claude Code on this computer and drive it from Composer.           | —                                                                                             | —                                  | [packages/plugins/plugin-claude/autocue/claude-code-task.mjs](../../../../../plugins/plugin-claude/autocue/claude-code-task.mjs)                     |
| plugin-claude › claude-code-cloud-task     | Delegate a project task to Claude Code (cloud), which opens and closes a pull request.      | —                                                                                             | —                                  | [packages/plugins/plugin-claude/autocue/claude-code-cloud-task.mjs](../../../../../plugins/plugin-claude/autocue/claude-code-cloud-task.mjs)         |
| plugin-claude › claude-code-cloud-pr       | A standalone Claude Code (cloud) chat opens a draft pull request and closes it on request.  | —                                                                                             | —                                  | [packages/plugins/plugin-claude/autocue/claude-code-cloud-pr.mjs](../../../../../plugins/plugin-claude/autocue/claude-code-cloud-pr.mjs)             |
| plugin-computer › composer-plugin          | An agent works the Composer Plugin template's tasks to write the World Clock plugin.        | —                                                                                             | —                                  | [packages/plugins/plugin-computer/autocue/composer-plugin.mjs](../../../../../plugins/plugin-computer/autocue/composer-plugin.mjs)                   |
| plugin-illustrator › dx-drawing            | Lay out a diagram with `dx drawing`, re-flow it, and import the SVG into a space.           | —                                                                                             | —                                  | on `main`                                                                                                                                            |
| plugin-markdown › write-and-link           | Write with live formatting, comment on a phrase, and link a new page.                       | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-markdown.mp4?v=797e74c3)   | markdown-write, markdown-checklist | [packages/plugins/plugin-markdown/autocue/write-and-link.mjs](../../../../../plugins/plugin-markdown/autocue/write-and-link.mjs)                     |
| plugin-meeting-recorder › meeting-recorder | A call takes the microphone and Composer offers to take meeting notes.                      | —                                                                                             | —                                  | [packages/plugins/plugin-meeting-recorder/autocue/meeting-recorder.mjs](../../../../../plugins/plugin-meeting-recorder/autocue/meeting-recorder.mjs) |
| plugin-projects › plan-a-project           | Create a project, brief its agent, break the work into tasks, and select tasks for it.      | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-projects.mp4?v=30bb87a3)   | project-tasks                      | [packages/plugins/plugin-projects/autocue/plan-a-project.mjs](../../../../../plugins/plugin-projects/autocue/plan-a-project.mjs)                     |
| plugin-projects › composer-plugin-registry | The assistant builds World Clock and publishes it to the private plugin registry.           | —                                                                                             | —                                  | [packages/plugins/plugin-projects/autocue/composer-plugin-registry.mjs](../../../../../plugins/plugin-projects/autocue/composer-plugin-registry.mjs) |
| plugin-projects › composer-plugin-desktop  | The Composer Plugin demo in the desktop app, built in a local sandbox.                      | —                                                                                             | —                                  | [packages/plugins/plugin-projects/autocue/composer-plugin-desktop.mjs](../../../../../plugins/plugin-projects/autocue/composer-plugin-desktop.mjs)   |
| plugin-sheet › budget                      | Enter a budget, total it with SUM, and change a value to watch the totals recompute.        | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-sheet.mp4?v=f7e67bab)      | sheet-budget                       | [packages/plugins/plugin-sheet/autocue/budget.mjs](../../../../../plugins/plugin-sheet/autocue/budget.mjs)                                           |
| plugin-sheet › sales-charts                | Create the Bramble Coffee Roasters space from its template and chart its sales report.      | [2026-10-16](https://assets.composer.space/demos/2026-10-16-plugin-sheet.mp4?v=bc00ceef)      | —                                  | on `claude/plugin-sheet-graph-companion-952dea`                                                                                                      |
| plugin-terra › planet                      | Create a planet, spin it, and reshape it live from its seed and sliders.                    | [2026-10-16](https://assets.composer.space/demos/2026-10-16-plugin-terra.mp4?v=6687a7c1)      | —                                  | [packages/plugins/plugin-terra/autocue/planet.mjs](../../../../../plugins/plugin-terra/autocue/planet.mjs)                                           |
| plugin-terra › tour-the-views              | Add five objects, show the gizmos, rotate and zoom, and tour the 3D, map and camera views.  | —                                                                                             | —                                  | [packages/plugins/plugin-terra/autocue/tour-the-views.mjs](../../../../../plugins/plugin-terra/autocue/tour-the-views.mjs)                           |
| plugin-spacetime › build-a-scene           | Create a scene, add a sphere and two vehicle presets from the templates, and orbit it.      | —                                                                                             | —                                  | [packages/plugins/plugin-spacetime/autocue/build-a-scene.mjs](../../../../../plugins/plugin-spacetime/autocue/build-a-scene.mjs)                     |
| plugin-table › reading-list                | Add a typed number column, enter rows, and sort by that column.                             | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-table.mp4?v=7bd261d8)      | table-column                       | [packages/plugins/plugin-table/autocue/reading-list.mjs](../../../../../plugins/plugin-table/autocue/reading-list.mjs)                               |

The other showcase clips (map, terra, spacetime, voxel, explorer, sheet, mermaid, markdown, presenter, tldraw,
excalidraw, canvas, outline, journal, registry, chess, handpan, project) come from the uncommitted showcase flow in
`temp/showcase/flow.mjs`, one 5s clip per plugin.
