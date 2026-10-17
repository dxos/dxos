# Showcase run report 202610170224

_Copied from `temp/showcase/overnight/REPORT.md` for review comments; images and videos are in the gitignored `temp/showcase/overnight`, so they show only on a machine that ran it. A new run writes its own report and never overwrites this file._

48/52 videos passed in 77.2 min. Takes, step screenshots and app logs are under `takes/<name>-<theme>`.

| Clip        | Theme | Length | Result | Attempts | Video                                                | Published     | Error                                                     | Flow                                                       |
| ----------- | ----- | ------ | ------ | -------- | ---------------------------------------------------- | ------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| composer    | light | 20s    | ok     | 1        | `temp/showcase/overnight/clips/light/composer.mp4`   | —             |                                                           | `packages/apps/composer-app/autocue/showcase.mjs`          |
| composer    | dark  | 33s    | ok     | 1        | `temp/showcase/overnight/clips/dark/composer.mp4`    | upload failed |                                                           | `packages/apps/composer-app/autocue/showcase.mjs`          |
| board       | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/board.mp4`      | —             |                                                           | `packages/plugins/plugin-board/autocue/showcase.mjs`       |
| board       | dark  | 18s    | ok     | 1        | `temp/showcase/overnight/clips/dark/board.mp4`       | upload failed |                                                           | `packages/plugins/plugin-board/autocue/showcase.mjs`       |
| canvas      | light | 20s    | ok     | 1        | `temp/showcase/overnight/clips/light/canvas.mp4`     | —             |                                                           | `packages/plugins/plugin-canvas/autocue/showcase.mjs`      |
| canvas      | dark  | 27s    | ok     | 1        | `temp/showcase/overnight/clips/dark/canvas.mp4`      | upload failed |                                                           | `packages/plugins/plugin-canvas/autocue/showcase.mjs`      |
| chess       | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/chess.mp4`      | —             |                                                           | `packages/plugins/plugin-chess/autocue/showcase.mjs`       |
| chess       | dark  | 25s    | ok     | 1        | `temp/showcase/overnight/clips/dark/chess.mp4`       | upload failed |                                                           | `packages/plugins/plugin-chess/autocue/showcase.mjs`       |
| code        | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/code.mp4`       | —             |                                                           | `packages/plugins/plugin-code/autocue/showcase.mjs`        |
| code        | dark  | 16s    | ok     | 1        | `temp/showcase/overnight/clips/dark/code.mp4`        | upload failed |                                                           | `packages/plugins/plugin-code/autocue/showcase.mjs`        |
| conductor   | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/conductor.mp4`  | —             |                                                           | `packages/plugins/plugin-conductor/autocue/showcase.mjs`   |
| conductor   | dark  | 16s    | ok     | 1        | `temp/showcase/overnight/clips/dark/conductor.mp4`   | upload failed |                                                           | `packages/plugins/plugin-conductor/autocue/showcase.mjs`   |
| excalidraw  | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/excalidraw.mp4` | —             |                                                           | `packages/plugins/plugin-excalidraw/autocue/showcase.mjs`  |
| excalidraw  | dark  | 18s    | ok     | 1        | `temp/showcase/overnight/clips/dark/excalidraw.mp4`  | upload failed |                                                           | `packages/plugins/plugin-excalidraw/autocue/showcase.mjs`  |
| explorer    | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/explorer.mp4`   | —             |                                                           | `packages/plugins/plugin-explorer/autocue/showcase.mjs`    |
| explorer    | dark  | 21s    | ok     | 1        | `temp/showcase/overnight/clips/dark/explorer.mp4`    | upload failed |                                                           | `packages/plugins/plugin-explorer/autocue/showcase.mjs`    |
| handpan     | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/handpan.mp4`    | —             |                                                           | `packages/plugins/plugin-handpan/autocue/showcase.mjs`     |
| handpan     | dark  | 23s    | ok     | 1        | `temp/showcase/overnight/clips/dark/handpan.mp4`     | upload failed |                                                           | `packages/plugins/plugin-handpan/autocue/showcase.mjs`     |
| illustrator | light | —      | FAILED | 2        | —                                                    | —             | clip: illustrator locator.click: Timeout 5000ms exceeded. | `packages/plugins/plugin-illustrator/autocue/showcase.mjs` |
| illustrator | dark  | —      | FAILED | 2        | —                                                    | —             | clip: illustrator locator.click: Timeout 5000ms exceeded. | `packages/plugins/plugin-illustrator/autocue/showcase.mjs` |
| kanban      | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/kanban.mp4`     | —             |                                                           | `packages/plugins/plugin-kanban/autocue/showcase.mjs`      |
| kanban      | dark  | 15s    | ok     | 1        | `temp/showcase/overnight/clips/dark/kanban.mp4`      | upload failed |                                                           | `packages/plugins/plugin-kanban/autocue/showcase.mjs`      |
| map         | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/map.mp4`        | —             |                                                           | `packages/plugins/plugin-map/autocue/showcase.mjs`         |
| map         | dark  | 26s    | ok     | 1        | `temp/showcase/overnight/clips/dark/map.mp4`         | upload failed |                                                           | `packages/plugins/plugin-map/autocue/showcase.mjs`         |
| markdown    | light | 20s    | ok     | 1        | `temp/showcase/overnight/clips/light/markdown.mp4`   | —             |                                                           | `packages/plugins/plugin-markdown/autocue/showcase.mjs`    |
| markdown    | dark  | 25s    | ok     | 1        | `temp/showcase/overnight/clips/dark/markdown.mp4`    | upload failed |                                                           | `packages/plugins/plugin-markdown/autocue/showcase.mjs`    |
| mermaid     | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/mermaid.mp4`    | —             |                                                           | `packages/plugins/plugin-mermaid/autocue/showcase.mjs`     |
| mermaid     | dark  | 22s    | ok     | 1        | `temp/showcase/overnight/clips/dark/mermaid.mp4`     | upload failed |                                                           | `packages/plugins/plugin-mermaid/autocue/showcase.mjs`     |
| presenter   | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/presenter.mp4`  | —             |                                                           | `packages/plugins/plugin-presenter/autocue/showcase.mjs`   |
| presenter   | dark  | 26s    | ok     | 1        | `temp/showcase/overnight/clips/dark/presenter.mp4`   | upload failed |                                                           | `packages/plugins/plugin-presenter/autocue/showcase.mjs`   |
| projects    | light | 20s    | ok     | 1        | `temp/showcase/overnight/clips/light/projects.mp4`   | —             |                                                           | `packages/plugins/plugin-projects/autocue/showcase.mjs`    |
| projects    | dark  | 27s    | ok     | 1        | `temp/showcase/overnight/clips/dark/projects.mp4`    | upload failed |                                                           | `packages/plugins/plugin-projects/autocue/showcase.mjs`    |
| script      | light | —      | FAILED | 2        | —                                                    | —             | setup: script page.waitForURL: Timeout 30000ms exceeded.  | `packages/plugins/plugin-script/autocue/showcase.mjs`      |
| script      | dark  | —      | FAILED | 2        | —                                                    | —             | setup: script page.waitForURL: Timeout 30000ms exceeded.  | `packages/plugins/plugin-script/autocue/showcase.mjs`      |
| sequencer   | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/sequencer.mp4`  | —             |                                                           | `packages/plugins/plugin-sequencer/autocue/showcase.mjs`   |
| sequencer   | dark  | 16s    | ok     | 1        | `temp/showcase/overnight/clips/dark/sequencer.mp4`   | upload failed |                                                           | `packages/plugins/plugin-sequencer/autocue/showcase.mjs`   |
| sheet       | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/sheet.mp4`      | —             |                                                           | `packages/plugins/plugin-sheet/autocue/showcase.mjs`       |
| sheet       | dark  | 22s    | ok     | 1        | `temp/showcase/overnight/clips/dark/sheet.mp4`       | upload failed |                                                           | `packages/plugins/plugin-sheet/autocue/showcase.mjs`       |
| spacetime   | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/spacetime.mp4`  | —             |                                                           | `packages/plugins/plugin-spacetime/autocue/showcase.mjs`   |
| spacetime   | dark  | 24s    | ok     | 1        | `temp/showcase/overnight/clips/dark/spacetime.mp4`   | upload failed |                                                           | `packages/plugins/plugin-spacetime/autocue/showcase.mjs`   |
| table       | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/table.mp4`      | —             |                                                           | `packages/plugins/plugin-table/autocue/showcase.mjs`       |
| table       | dark  | 16s    | ok     | 1        | `temp/showcase/overnight/clips/dark/table.mp4`       | upload failed |                                                           | `packages/plugins/plugin-table/autocue/showcase.mjs`       |
| tasks       | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/tasks.mp4`      | —             |                                                           | `packages/plugins/plugin-tasks/autocue/showcase.mjs`       |
| tasks       | dark  | 18s    | ok     | 1        | `temp/showcase/overnight/clips/dark/tasks.mp4`       | upload failed |                                                           | `packages/plugins/plugin-tasks/autocue/showcase.mjs`       |
| terra       | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/terra.mp4`      | —             |                                                           | `packages/plugins/plugin-terra/autocue/showcase.mjs`       |
| terra       | dark  | 23s    | ok     | 1        | `temp/showcase/overnight/clips/dark/terra.mp4`       | upload failed |                                                           | `packages/plugins/plugin-terra/autocue/showcase.mjs`       |
| tldraw      | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/tldraw.mp4`     | —             |                                                           | `packages/plugins/plugin-tldraw/autocue/showcase.mjs`      |
| tldraw      | dark  | 18s    | ok     | 1        | `temp/showcase/overnight/clips/dark/tldraw.mp4`      | upload failed |                                                           | `packages/plugins/plugin-tldraw/autocue/showcase.mjs`      |
| uml         | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/uml.mp4`        | —             |                                                           | `packages/plugins/plugin-uml/autocue/showcase.mjs`         |
| uml         | dark  | 18s    | ok     | 1        | `temp/showcase/overnight/clips/dark/uml.mp4`         | upload failed |                                                           | `packages/plugins/plugin-uml/autocue/showcase.mjs`         |
| voxel       | light | 10s    | ok     | 1        | `temp/showcase/overnight/clips/light/voxel.mp4`      | —             |                                                           | `packages/plugins/plugin-voxel/autocue/showcase.mjs`       |
| voxel       | dark  | 16s    | ok     | 1        | `temp/showcase/overnight/clips/dark/voxel.mp4`       | upload failed |                                                           | `packages/plugins/plugin-voxel/autocue/showcase.mjs`       |

## Grid

`layout.mjs` laid out `temp/grid-zoom` (`*` marks a tour cell):

```
board        chess        code         composer     conductor    excalidraw
explorer     handpan      kanban       map          mermaid      board
sequencer    sheet        spacetime    table        tasks        terra
*markdown    *canvas      *projects    tldraw       uml          voxel
excalidraw   presenter    chess        code         composer     explorer
conductor    handpan      kanban       map          mermaid      sequencer
3 tour + 33 grid cells from 24 clips → temp/grid-zoom; closest repeat is 4 cells apart
```

## Composite

`composite.mp4` (also `temp/composite/composite.mp4`), a frame every 6s:

![composite](../../../temp/showcase/overnight/composite.png)

## Frames

Four frames from each video, evenly spaced: check each shows its plugin working, not a blank or wrong plank.

### composer (light)

![composer light](../../../temp/showcase/overnight/clips/light/composer.png)

### composer (dark)

![composer dark](../../../temp/showcase/overnight/clips/dark/composer.png)

### board (light)

![board light](../../../temp/showcase/overnight/clips/light/board.png)

### board (dark)

![board dark](../../../temp/showcase/overnight/clips/dark/board.png)

### canvas (light)

![canvas light](../../../temp/showcase/overnight/clips/light/canvas.png)

### canvas (dark)

![canvas dark](../../../temp/showcase/overnight/clips/dark/canvas.png)

### chess (light)

![chess light](../../../temp/showcase/overnight/clips/light/chess.png)

### chess (dark)

![chess dark](../../../temp/showcase/overnight/clips/dark/chess.png)

### code (light)

![code light](../../../temp/showcase/overnight/clips/light/code.png)

### code (dark)

![code dark](../../../temp/showcase/overnight/clips/dark/code.png)

### conductor (light)

![conductor light](../../../temp/showcase/overnight/clips/light/conductor.png)

### conductor (dark)

![conductor dark](../../../temp/showcase/overnight/clips/dark/conductor.png)

### excalidraw (light)

![excalidraw light](../../../temp/showcase/overnight/clips/light/excalidraw.png)

### excalidraw (dark)

![excalidraw dark](../../../temp/showcase/overnight/clips/dark/excalidraw.png)

### explorer (light)

![explorer light](../../../temp/showcase/overnight/clips/light/explorer.png)

### explorer (dark)

![explorer dark](../../../temp/showcase/overnight/clips/dark/explorer.png)

### handpan (light)

![handpan light](../../../temp/showcase/overnight/clips/light/handpan.png)

### handpan (dark)

![handpan dark](../../../temp/showcase/overnight/clips/dark/handpan.png)

### kanban (light)

![kanban light](../../../temp/showcase/overnight/clips/light/kanban.png)

### kanban (dark)

![kanban dark](../../../temp/showcase/overnight/clips/dark/kanban.png)

### map (light)

![map light](../../../temp/showcase/overnight/clips/light/map.png)

### map (dark)

![map dark](../../../temp/showcase/overnight/clips/dark/map.png)

### markdown (light)

![markdown light](../../../temp/showcase/overnight/clips/light/markdown.png)

### markdown (dark)

![markdown dark](../../../temp/showcase/overnight/clips/dark/markdown.png)

### mermaid (light)

![mermaid light](../../../temp/showcase/overnight/clips/light/mermaid.png)

### mermaid (dark)

![mermaid dark](../../../temp/showcase/overnight/clips/dark/mermaid.png)

### presenter (light)

![presenter light](../../../temp/showcase/overnight/clips/light/presenter.png)

### presenter (dark)

![presenter dark](../../../temp/showcase/overnight/clips/dark/presenter.png)

### projects (light)

![projects light](../../../temp/showcase/overnight/clips/light/projects.png)

### projects (dark)

![projects dark](../../../temp/showcase/overnight/clips/dark/projects.png)

### sequencer (light)

![sequencer light](../../../temp/showcase/overnight/clips/light/sequencer.png)

### sequencer (dark)

![sequencer dark](../../../temp/showcase/overnight/clips/dark/sequencer.png)

### sheet (light)

![sheet light](../../../temp/showcase/overnight/clips/light/sheet.png)

### sheet (dark)

![sheet dark](../../../temp/showcase/overnight/clips/dark/sheet.png)

### spacetime (light)

![spacetime light](../../../temp/showcase/overnight/clips/light/spacetime.png)

### spacetime (dark)

![spacetime dark](../../../temp/showcase/overnight/clips/dark/spacetime.png)

### table (light)

![table light](../../../temp/showcase/overnight/clips/light/table.png)

### table (dark)

![table dark](../../../temp/showcase/overnight/clips/dark/table.png)

### tasks (light)

![tasks light](../../../temp/showcase/overnight/clips/light/tasks.png)

### tasks (dark)

![tasks dark](../../../temp/showcase/overnight/clips/dark/tasks.png)

### terra (light)

![terra light](../../../temp/showcase/overnight/clips/light/terra.png)

### terra (dark)

![terra dark](../../../temp/showcase/overnight/clips/dark/terra.png)

### tldraw (light)

![tldraw light](../../../temp/showcase/overnight/clips/light/tldraw.png)

### tldraw (dark)

![tldraw dark](../../../temp/showcase/overnight/clips/dark/tldraw.png)

### uml (light)

![uml light](../../../temp/showcase/overnight/clips/light/uml.png)

### uml (dark)

![uml dark](../../../temp/showcase/overnight/clips/dark/uml.png)

### voxel (light)

![voxel light](../../../temp/showcase/overnight/clips/light/voxel.png)

### voxel (dark)

![voxel dark](../../../temp/showcase/overnight/clips/dark/voxel.png)
