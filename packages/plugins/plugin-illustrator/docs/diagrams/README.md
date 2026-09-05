# Diagram corpus

Architecture diagrams of the DXOS and EDGE repositories, written as mermaid flowcharts and
compiled by the illustrator's engine-backed flowchart dialect (`src/model/mermaid-engine.ts`).
Each `.mmd` is the source of truth; the `.svg` beside it is a rendered artifact.

The corpus is simultaneously the **eval fixture set**: `src/model/corpus.test.ts` compiles every
source, asserts no hard layout defects (`Diagnostics.errors`), snapshots the soft metrics, and
checks that every `%% ref` names a path that exists in this repository (or a URL) — a diagram of
the code must not drift from the code.

## Conventions

- Subset of mermaid: `flowchart TB|LR`, `subgraph id [Label] … end` (no nesting), `Id[Label]`,
  `A --> B`, `A -->|label| B`. Anything else is ignored by the parser.
- `%% ref <Id> <path-or-url>` says what a node depicts. It is a comment to mermaid proper, so the
  sources render unchanged in any other mermaid tool; here it becomes `WorldObject.ref`, which
  selection and activation use to resolve the referenced object (activation opens ECHO refs; URLs
  and paths are carried for tooling).
- Keep a diagram to ≲ 14 nodes and ≤ 3 groups; split rather than crowd.

## Commands

```bash
moon run plugin-illustrator:render-diagrams
```

renders every `.mmd` to `.svg` and prints the Tier-1 report; `-- --scoreboard` prints the Tier-2
strategy × metric table instead.
