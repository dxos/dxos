# Canvas architecture

The Composer and EDGE architectures as nested canvas drawings, with three reading guides that embed
and link them, and a sheet of plugin metrics with a bar chart.

- Code: `partial.ts`, exported as `Architecture.Partial` from `@dxos/plugin-canvas/Architecture`. Diagram sources are `plugin-canvas/docs/diagrams/*.dx`,
  precompiled to `compiled.json`.
- Requires: nothing
- Provides: `drawings.<id>` for each diagram below, `docs.composer`, `docs.dxos`, `docs.edge`, `metrics`
- Clock: unused
- Used by: `ArchitectureSpace.makeTemplate` (`org.dxos.plugin.canvas.template.architecture`) and
  `FieldstoneSpace.makeTemplate` (plugin-debug)

## Contents

- 12 `Drawing.Drawing`, each with one `Drawing.Canvas` (`lattice: true`, `readonly: true`).

  | Id                   | Name            | Boxes | Arrows | Opens             |
  | -------------------- | --------------- | ----- | ------ | ----------------- |
  | `composer`           | Overview        | 12    | 16     | 5 drill-downs     |
  | `composer-framework` | App Framework   | 12    | 12     |                   |
  | `composer-data`      | Data Stack      | 12    | 14     | `composer-echo`   |
  | `composer-plugin`    | Plugin Anatomy  | 12    | 12     |                   |
  | `composer-compute`   | Compute         | 12    | 11     |                   |
  | `composer-echo`      | echo-host       | 14    | 16     |                   |
  | `edge`               | CF Workers      | 11    | 15     | 4 drill-downs     |
  | `edge-router`        | Router          | 11    | 10     |                   |
  | `edge-db`            | db-service      | 12    | 11     | `edge-subduction` |
  | `edge-compute`       | compute-service | 11    | 10     |                   |
  | `edge-hub`           | hub-service     | 9     | 8      |                   |
  | `edge-subduction`    | Subduction      | 12    | 13     |                   |

- `composer` has three groups: App layer, SDK and data, Remote. Its drill-downs: Framework →
  `composer-framework`, Services → `composer-data`, Feature Plugins → `composer-plugin`, Compute →
  `composer-compute`, Edge → `edge`.
- `edge` has three groups: Clients, Gateway, Services. Its drill-downs: Router → `edge-router`, Db →
  `edge-db`, Compute → `edge-compute`, Hub → `edge-hub`.
- A drill-down box is a frame whose `link.object` is a Ref to the child drawing. The deepest path is
  `composer` → `edge` → `edge-db` → `edge-subduction`.
- Boxes may carry a `ref` to a repository path, for example `packages/sdk/app-framework`.
- 3 `Markdown.Document`:
  - **Composer**: embeds the `composer` drawing; links DXOS and EDGE; sections The app, The
    framework, A plugin, Data and compute.
  - **DXOS**: embeds the `composer-data` drawing; links EDGE; a mermaid sequence diagram "An edit,
    end to end".
  - **EDGE**: embeds the `edge` drawing; a mermaid sequence diagram "A device connecting".
  - Each has a `## Reading the code` section. Links use space-relative `echo:///<id>` URIs.
- 1 `Sheet.Sheet` **Plugin metrics** (`metrics.ts`): columns Plugin, KLOC (thousands of lines), PRs, Tests; 20 rows, one per real
  `packages/plugins` package, with made-up figures. One chart on the sheet: `bar` over `A1:D21`, `header` and
  `horizontal`, so plugins run down the y axis and KLOC, PRs and Tests are bar series along the x axis. The chart
  shows in the sheet's Charts companion.
- 1 `Collection` "Architecture" on the space root, in order: Composer, DXOS, EDGE (docs), Overview,
  CF Workers (drawings), Plugin metrics (sheet).

## Checks

- 12 drawings, every canvas `readonly`.
- The Architecture collection's labels are `Composer, DXOS, EDGE, Overview, CF Workers, Plugin metrics`.
- The metrics sheet is 21 rows by 4 columns with one horizontal bar chart over `A1:D21`.
- Every drill-down box in `composer` and `edge` is a frame linked to the right child drawing.
- Boxes sit on the lattice.
- `compiled.json` matches the `.dx` sources (`DX_UPDATE_DIAGRAMS=1` regenerates it).
- Composer links DXOS and EDGE and embeds its drawing. DXOS and EDGE each contain
  `## Reading the code` and a mermaid `sequenceDiagram`.
- No paragraph contains a hard line break outside fenced code.
