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
clips into `temp/showcase/clips`, lays out `temp/grid-zoom`, and records the composite to `temp/composite/composite.mp4`.

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

The composite is recorded from the story in isolation with the controls hidden and the light theme:
`/iframe.html?id=ui-react-ui-canvas-gridzoom--default&viewMode=story&args=controls:!false&globals=theme:light`.

Clips are recorded headless with `--gpu on`, so 3D plugins render on the GPU, and without the action feed
(`--overlay off`) or captions.

## Autocue scripts

Every autocue script under `packages/apps/composer-app` and `packages/plugins`, and the showcase clips cut from it.

| Script                                                                                                                  | Shows                                                                                       | Video                                                                                         | Showcase clips                     |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------- |
| [composer-app/composer-basics](../../../../../apps/composer-app/autocue/composer-basics.mjs)                            | A tour of the default space: comment on the README, write and link a document.              | —                                                                                             | —                                  |
| [composer-app/two-peer-collaboration](../../../../../apps/composer-app/autocue/two-peer-collaboration.mjs)              | Alice and Bob share a space by invitation and write one document together.                  | —                                                                                             | —                                  |
| [composer-app/desktop-input](../../../../../apps/composer-app/autocue/desktop-input.mjs)                                | The desktop app's input paths: a plugin toggle and a menu dismissed by an outside click.    | —                                                                                             | —                                  |
| [plugin-agent/two-people-one-agent](../../../../../plugins/plugin-agent/autocue/two-people-one-agent.mjs)               | Alice and Bob talk to one agent in private chats, and Bob's update reaches Alice.           | —                                                                                             | —                                  |
| plugin-agent/agent-identities (on `main`)                                                                               | Turn on agent identities and add an agent, end to end.                                      | —                                                                                             | —                                  |
| [plugin-canvas/draw-and-nest](../../../../../plugins/plugin-canvas/autocue/draw-and-nest.mjs)                           | Draw and label shapes, connect them, and nest a detail scene inside a frame.                | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-canvas.mp4?v=5b3598bd)     | canvas-shapes, canvas-nest         |
| [plugin-canvas/composer-uml](../../../../../plugins/plugin-canvas/autocue/composer-uml.mjs)                             | An architecture diagram of composer-app, with nested scenes for the plugins and the client. | [2026-10-10](https://assets.composer.space/demos/2026-10-10-plugin-canvas-uml.mp4?v=b7c7aa13) | uml-top, uml-nested                |
| [plugin-claude/claude-code-task](../../../../../plugins/plugin-claude/autocue/claude-code-task.mjs)                     | Assign a project task to Claude Code on this computer and drive it from Composer.           | —                                                                                             | —                                  |
| [plugin-claude/claude-code-cloud-task](../../../../../plugins/plugin-claude/autocue/claude-code-cloud-task.mjs)         | Delegate a project task to Claude Code (cloud), which opens and closes a pull request.      | —                                                                                             | —                                  |
| [plugin-claude/claude-code-cloud-pr](../../../../../plugins/plugin-claude/autocue/claude-code-cloud-pr.mjs)             | A standalone Claude Code (cloud) chat opens a draft pull request and closes it on request.  | —                                                                                             | —                                  |
| [plugin-computer/composer-plugin](../../../../../plugins/plugin-computer/autocue/composer-plugin.mjs)                   | An agent works the Composer Plugin template's tasks to write the World Clock plugin.        | —                                                                                             | —                                  |
| plugin-illustrator/dx-drawing (on `main`)                                                                               | Lay out a diagram with `dx drawing`, re-flow it, and import the SVG into a space.           | —                                                                                             | —                                  |
| [plugin-markdown/write-and-link](../../../../../plugins/plugin-markdown/autocue/write-and-link.mjs)                     | Write with live formatting, comment on a phrase, and link a new page.                       | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-markdown.mp4?v=797e74c3)   | markdown-write, markdown-checklist |
| [plugin-meeting-recorder/meeting-recorder](../../../../../plugins/plugin-meeting-recorder/autocue/meeting-recorder.mjs) | A call takes the microphone and Composer offers to take meeting notes.                      | —                                                                                             | —                                  |
| [plugin-projects/plan-a-project](../../../../../plugins/plugin-projects/autocue/plan-a-project.mjs)                     | Create a project, brief its agent, break the work into tasks, and select tasks for it.      | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-projects.mp4?v=30bb87a3)   | project-tasks                      |
| [plugin-projects/composer-plugin-registry](../../../../../plugins/plugin-projects/autocue/composer-plugin-registry.mjs) | The assistant builds World Clock and publishes it to the private plugin registry.           | —                                                                                             | —                                  |
| [plugin-projects/composer-plugin-desktop](../../../../../plugins/plugin-projects/autocue/composer-plugin-desktop.mjs)   | The Composer Plugin demo in the desktop app, built in a local sandbox.                      | —                                                                                             | —                                  |
| [plugin-sheet/budget](../../../../../plugins/plugin-sheet/autocue/budget.mjs)                                           | Enter a budget, total it with SUM, and change a value to watch the totals recompute.        | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-sheet.mp4?v=f7e67bab)      | sheet-budget                       |
| plugin-sheet/sales-charts (on `claude/plugin-sheet-graph-companion-952dea`)                                             | Create the Bramble Coffee Roasters space from its template and chart its sales report.      | [2026-10-16](https://assets.composer.space/demos/2026-10-16-plugin-sheet.mp4?v=bc00ceef)      | —                                  |
| [plugin-table/reading-list](../../../../../plugins/plugin-table/autocue/reading-list.mjs)                               | Add a typed number column, enter rows, and sort by that column.                             | [2026-10-09](https://assets.composer.space/demos/2026-10-09-plugin-table.mp4?v=7bd261d8)      | table-column                       |

The other showcase clips (map, terra, spacetime, voxel, explorer, sheet, mermaid, markdown, presenter, tldraw,
excalidraw, canvas, outline, journal, registry, chess, handpan, project) come from the uncommitted showcase flow in
`temp/showcase/flow.mjs`, one 5s clip per plugin.
