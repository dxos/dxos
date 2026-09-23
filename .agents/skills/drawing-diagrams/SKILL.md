---
name: drawing-diagrams
description: >-
  Draw an architecture diagram of DXOS code (a package, a module graph, a subsystem) with
  plugin-illustrator's own mermaid engine and SVG renderer, and show it as an image. Use when asked
  to draw, render, or show a diagram of the codebase, to "use the illustrator" on something, to add
  or regenerate a diagram in `packages/plugins/plugin-illustrator/docs/diagrams/`, or to judge the
  layout engine on a real graph. For a hand-drawn explanatory figure inside an Artifact page, use
  `artifact-diagramming` instead.
---

# Drawing diagrams

The pipeline is: a mermaid-subset `.mmd` source → `MermaidEngine.compile` (ELK layout, `@dxos/diagram`)
→ `SceneSvg` (plugin-illustrator's SVG variant) → a standalone `.svg` plus a layout report. One moon
task runs it: `plugin-illustrator:render-diagrams`
(`packages/plugins/plugin-illustrator/scripts/render-diagrams.tsx`).

## 1. Derive the graph from the code, not from memory

The edges must be real imports, so the diagram can be checked against the code. For a single package
this prints what each module imports, internal and workspace:

```bash
cd packages/<area>/<pkg>/src
find . -name '*.ts' ! -name '*.test.ts' ! -name '*.tst.ts' ! -name index.ts | sort | while read -r f; do
  echo "$f -> $(grep -oE "from '(\.\.?/|@dxos/)[^']+'" "$f" | sed -E "s/from '//;s/'//" | sort -u | tr '\n' ' ')"
done
```

For a set of packages, read each `package.json`'s `dependencies` instead. An edge points **at what
the source imports**.

A real package has far more modules than a diagram holds (`@dxos/compute-runtime` has 40). To cut it
to ≲ 14:

- Drop `testing/`, `errors`, constants, ids, and helpers nothing interesting imports.
- Keep the modules with the most internal edges and the largest files (`wc -l`); they carry the story.
- Group by role (often the subdirectory: `triggers/`, `services/`), at most 3 groups.
- When you drop a module, keep the edge it relayed: `A → b-helper → C` becomes `A → C`.

## 2. Write the source

Conventions (full text in `plugin-illustrator/docs/diagrams/README.md`):

- Only this subset parses: `flowchart TB|LR`, `subgraph id [Label] … end` (**no nesting**), `Id[Label]`,
  `A --> B`, `A -->|label| B`. Anything else is silently ignored — check the node count in the report.
- **≲ 14 nodes, ≤ 3 groups.** Past that crossings climb fast; split into two diagrams.
- **Labels ≤ 17 chars.** The box is a fixed width and the SVG draws a label on one line, so
  `RemoteProcessHandle` (19) spills over both edges. The node id can stay long; shorten only the
  `[Label]`.
- Label only the edges that say something (`|invokes handlers|`); unlabelled edges route more cleanly.
- End with one `%% ref <Id> <repo-relative path>` per node. It is a mermaid comment, so the file
  still renders elsewhere; in the corpus test every ref must point at a path that exists.

## 3. Render

The task declares its prerequisites (tool builds, `gen-modules`, upstream `^:build`), so on a fresh
checkout the first run builds the plugin's whole dependency graph — a few minutes; **run it in the
background**. In the cloud sandbox with no `node_modules`, run `bash .config/claude-code-setup.sh`
first and put proto on the path (`export PATH="$HOME/.proto/shims:$HOME/.proto/bin:$PATH"`); see
`cloud-sandbox`.

- **A one-off diagram** — write the `.mmd` in the scratchpad and pass its absolute path. Only that file is
  rendered (≈ 30 s once built); the `.svg` lands beside it and nothing in the repo changes:
  ```bash
  moon run plugin-illustrator:render-diagrams -- /abs/path/to/compute-core.mmd
  ```
- **A corpus diagram** (meant to be committed) — put it in `plugin-illustrator/docs/diagrams/` and run
  the task with no arguments. It re-renders all ~10 diagrams (≈ 5 min) and rewrites every `.svg`;
  unchanged ones come out byte-identical. The corpus doubles as the layout eval set
  (`src/model/corpus.test.ts` snapshots its metrics), so run
  `moon run plugin-illustrator:test -- src/model/corpus.test.ts` and commit the updated snapshot with it.

The report line per diagram is the verdict:

```
compute-core: 17 nodes, 20 connectors, 6 crossings, 32 bends
  warning: Connectors "edges/Process-Operation-5" and "edges/Routine-Operation-15" cross.
```

`nodes` counts group frames too. Warnings are soft metrics; an `error` (overlap, route through a
node) fails the task with exit 1. The `label-overflow` check assumes long labels wrap to a second
line, which the SVG does not do, so an over-long label passes the report. Only looking at the image
catches it. If crossings are high, try
`-- --scoreboard` to compare the `layered` and `elk` strategies, reorder nodes inside groups, or
split the diagram, then render again.

## 4. Show it

The SVG styles itself inline, so any browser renders it as is. Chat and PR bodies want a raster —
convert it with the repo's Playwright, from the repo root:

```bash
SVG=/abs/path/to/compute-core.svg CHROMIUM_PATH=/opt/pw-browsers/chromium node --input-type=module -e "
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const svg = process.env.SVG;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setContent(readFileSync(svg, 'utf8'));
await page.locator('svg').first().screenshot({ path: svg.replace(/\.svg\$/, '.png') });
await browser.close();
"
```

`CHROMIUM_PATH` is the cloud sandbox's pre-installed browser; omit it locally. Look at the PNG
yourself before sending it (`Read` shows the image) — the report cannot tell you a label sits on an
arrow — then send the PNG and SVG to the user (`SendUserFile`), and state the report's crossings and
bends and any visible defects alongside it. For a PR, publish the PNG via `hosting-artifacts`
rather than committing it.
