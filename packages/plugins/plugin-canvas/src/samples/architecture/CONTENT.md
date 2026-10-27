# Canvas architecture

The Composer and EDGE architectures as nested canvas drawings, with three reading guides that embed
and link them, a sheet of plugin metrics with a bar chart and a pie chart, and an ECHO design document
that embeds three ECHO diagrams and a benchmarks sheet.

- Code: `partial.ts`, exported as `Architecture.Partial` from `@dxos/plugin-canvas/Architecture`. Diagram sources are `plugin-canvas/docs/diagrams/*.dx`,
  precompiled to `compiled.json`.
- Requires: nothing
- Provides: `drawings.<id>` for each diagram below, `docs.composer`, `docs.dxos`, `docs.edge`, `echo`, `metrics`,
  `design`, `benchmarks`
- Clock: unused
- Used by: `ArchitectureSpace.makeTemplate` (`org.dxos.plugin.canvas.template.architecture`) and
  `FieldstoneSpace.makeTemplate` (plugin-debug)

## Contents

- 15 `Drawing.Drawing`, each with one `Drawing.Canvas` (`lattice: true`, `readonly: true`).

  | Id                   | Name             | Boxes | Arrows | Opens             |
  | -------------------- | ---------------- | ----- | ------ | ----------------- |
  | `composer`           | Overview         | 12    | 16     | 5 drill-downs     |
  | `composer-framework` | App Framework    | 12    | 12     |                   |
  | `composer-data`      | Data Stack       | 12    | 14     | `composer-echo`   |
  | `composer-plugin`    | Plugin Anatomy   | 12    | 12     |                   |
  | `composer-compute`   | Compute          | 12    | 11     |                   |
  | `composer-echo`      | echo-host        | 14    | 16     |                   |
  | `edge`               | CF Workers       | 11    | 15     | 4 drill-downs     |
  | `edge-router`        | Router           | 11    | 10     |                   |
  | `edge-db`            | db-service       | 12    | 11     | `edge-subduction` |
  | `edge-compute`       | compute-service  | 11    | 10     |                   |
  | `edge-hub`           | hub-service      | 9     | 8      |                   |
  | `edge-subduction`    | Subduction       | 12    | 13     |                   |
  | `echo-model`         | ECHO data model  | 10    | 9      |                   |
  | `echo-sync`          | ECHO replication | 9     | 8      | `composer-echo`   |
  | `echo-query`         | ECHO queries     | 8     | 7      |                   |

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
    framework, Plugin registry, Data and compute.
  - **DXOS**: embeds the `composer-data` drawing; links EDGE; a mermaid sequence diagram "An edit,
    end to end".
  - **EDGE**: embeds the `edge` drawing; a mermaid sequence diagram "A device connecting".
  - Each has a `## Reading the code` section. Links use space-relative `echo:///<id>` URIs.
- 1 `Markdown.Document` **ECHO** (`echo.md`, built by `echo-deck.ts`): a 29-slide presenter deck explaining ECHO from
  the foundations: types and JSON Schema, Automerge and DXOS's extensions to it, spaces and credentials, queries,
  feeds, P2P (MESH), EDGE on Cloudflare, schema migration and agents. Slides use `<v-clicks>` reveal steps and
  highlighted code excerpts from the repository, and embed the `composer-echo`, `edge`, `edge-subduction` and
  `composer-data` drawings, whose `{{id}}` placeholders become space-relative URIs.
- 1 `Sheet.Sheet` **Plugin metrics** (`metrics.ts`): columns Plugin, PRs, Tests, Closed issues, Open issues; 20 rows, one per real
  `packages/plugins` package, with made-up figures. Two charts on the sheet, both in its Charts companion: `bar` over
  `A1:E21`, `header`, `horizontal` and `stacked`, so plugins run down the y axis and the four measures stack into one bar
  along the x axis; and `pie` over `A1:B9`, `header`, the eight busiest plugins' share of merged PRs.
- 1 `Markdown.Document` **ECHO design** (`echo-design.md`, built by `echo-design.ts`): eight numbered chapters (Goals,
  Data model, Schema, Replication, Queries, Spaces and security, Performance, Roadmap). Data model, Replication and
  Queries each embed their diagram (`echo-model`, `echo-sync`, `echo-query`); Performance embeds the benchmarks sheet.
  `{{name}}` placeholders become block embeds by space-relative URI. The multi-actor collaboration scene builds this
  document up from its outline (`.agents/projects/multi-actor/ECHO-SCENE.md`).
- 1 `Sheet.Sheet` **ECHO benchmarks**: columns Operation, p50 (ms), p95 (ms), Target (ms); 10 rows of illustrative
  timings; one horizontal `bar` chart over `A1:D11`.
- 1 `Collection` "Architecture" on the space root, in order: Composer, DXOS, EDGE, ECHO design (docs), ECHO (deck),
  Overview, CF Workers (drawings), Plugin metrics (sheet).

## Checks

- 15 drawings, every canvas `readonly`.
- The Architecture collection's labels are `Composer, DXOS, EDGE, ECHO design, ECHO, Overview, CF Workers, Plugin metrics`.
- ECHO design has eight `## N.` chapters and embeds ECHO data model, ECHO replication, ECHO queries and ECHO benchmarks, in that order.
- The metrics sheet is 21 rows by 5 columns with a horizontal bar chart over `A1:E21` and a pie chart over `A1:B9`.
- Every drill-down box in `composer` and `edge` is a frame linked to the right child drawing.
- Boxes sit on the lattice.
- `compiled.json` matches the `.dx` sources (`DX_UPDATE_DIAGRAMS=1` regenerates it).
- Composer links DXOS and EDGE and embeds its drawing. DXOS and EDGE each contain
  `## Reading the code` and a mermaid `sequenceDiagram`.
- No paragraph contains a hard line break outside fenced code.
