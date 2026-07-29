# Constrained diagramming substrate

Date: 2026-07-29
Status: design approved, not implemented

A diagramming layer that renders technical drawings projected from a source-of-truth DSL,
allows constrained editing that writes back to that DSL, and replaces
`react-ui-canvas-editor` as the substrate for `plugin-conductor`.

## Problem

`plugin-illustrator` can compile Mermaid to a scene and hand it to a whiteboard renderer
(tldraw, excalidraw). That is the wrong shape for technical drawings:

- The whiteboard owns an open document, so "constrained" can only be achieved by removal.
- Neither renderer models ports, so links attach to shape centres.
- Nothing ties a rendered node back to the source it came from, so edits cannot round-trip.

Separately, `plugin-conductor` sits on ~11.8k LOC of hand-rolled canvas code
(`react-ui-canvas` 2.4k, `react-ui-canvas-editor` 5.1k, `react-ui-canvas-compute` 4.3k)
that has no group/hierarchy support.

Both want the same thing: a renderer whose model is authoritative, driven by a declared
ontology, over a source it does not own.

## Decisions

### Source of truth is the DSL, not the diagram

The diagram is a projection used to edit an underlying spec. It is not the artifact.

The diagram additionally accumulates render-only state that the DSL cannot express
(pinned positions, free text blocks, labels for read-only sources). That lives in an
**overlay**, not in the source.

### Substrate: React Flow (`@xyflow/react`)

| Requirement             | React Flow                            | tldraw               | Excalidraw   | Hand-rolled  |
| ----------------------- | ------------------------------------- | -------------------- | ------------ | ------------ |
| Nodes with compartments | plain React DOM                       | custom shape API     | element soup | SVG shapes   |
| Multiple ports per side | yes (demonstrated in-repo)            | shape-level bindings | none         | `anchors.ts` |
| Hierarchical groups     | native `parentId` + `extent:'parent'` | frames               | none         | absent       |
| Snap to grid            | `snapToGrid`                          | yes                  | partial      | `useSnap.ts` |
| Auto-layout             | controlled model                      | fights the editor    | partial      | yes          |
| Constrained editing     | by construction                       | subtractive          | subtractive  | yes          |

React Flow is a controlled component: our model is authoritative and the canvas is a
projection of it. That is the same property the DSL-is-truth requirement demands, one
level down. tldraw and Excalidraw invert it.

There is already a working in-repo spike —
`react-ui-canvas-editor/src/components/GraphCanvas/` — covering node/edge mapping from
`@dxos/graph`, three source handles per side at 30/50/70%, `snapToGrid`, and reuse of the
shape registry. `react-ui-board/src/components/Chain` is a second consumer.

D3 was rejected: it is a toolkit, not a substrate — it is what the 11.8k hand-rolled LOC
already is.

### Licensing

Checked against installed versions:

| Library                  | Version | License                      | Production use                       |
| ------------------------ | ------- | ---------------------------- | ------------------------------------ |
| `@tldraw/*`              | 3.0.0   | tldraw license (proprietary) | **paid license required**            |
| `@excalidraw/excalidraw` | 0.18.1  | MIT                          | free                                 |
| `@xyflow/react`          | 12.8.1  | MIT                          | free (attribution caveat)            |
| `elkjs`                  | 0.9.3   | EPL-2.0                      | free (weak copyleft; unmodified use) |
| `d3`                     | 7.9.0   | ISC                          | free                                 |

Two findings, both needing a real review rather than an engineering judgement:

1. **tldraw is not open source.** The installed v3.0.0 ships `LicenseManager.js` and
   `watermarks.js`; its `LICENSE.md` points at the tldraw license, whose current text
   requires a paid agreement for production use and forbids interfering with license-key
   enforcement. `plugin-tldraw` depends on it today. Out of scope here — the intent is to
   move `plugin-tldraw` out of the monorepo into a third-party non-production repo later,
   not to retire it as part of this work.
2. **React Flow's attribution.** The library is MIT, but xyflow asks that
   `proOptions.hideAttribution` only be used with a Pro subscription.
   `GraphCanvas.tsx` already sets it. A request layered on a permissive license, not a
   technical restriction — but a pre-existing question.

This is a reason to build the new substrate on React Flow rather than deepening the tldraw
dependency.

## Architecture

Three tiers plus an overlay. **The renderer never sees a DSL.**

```
Source (per dialect)          Neutral model                   Renderer
────────────────────          ─────────────                   ────────
ECHO ComputeGraph  ─┐                                      ┌─ React Flow
Mermaid text       ─┼─ project ─▶ Graph + ontology kinds ───┤  (controlled)
Code AST           ─┘ ◀─ apply     + provenance (opaque)   └─
<future>                              ▲
                          Overlay ────┘  pinned positions, labels, notes
                       (ECHO-persisted — the only tier that syncs)
```

Sources have genuinely different representations — an ECHO object graph, canonical text, a
read-only syntax tree — and are normalised on projection into one in-memory structure
under our control. Provenance is opaque to the renderer (`unknown` at that boundary): a
source span for Mermaid, a node path for an AST, a DXN for ECHO. Only `dialect.apply`
reads it.

### Neutral representation: extend `@dxos/graph`

The neutral model is not a new package. `@dxos/graph` (928 LOC) is already generic —
`Node { id, type?, data? }`, `Edge { id, type?, source, target, data? }` — and is the
right home. Two additive changes:

```ts
// Node: inline containment. Group is a node whose kind admits children.
parent: Schema.optional(Schema.String),

// Edge: named attachment points.
sourcePort: Schema.optional(Schema.String),
targetPort: Schema.optional(Schema.String),
```

Both are justified by existing duplication rather than by this design's convenience:

- **Ports exist twice, incompatibly.** `ComputeEdge` extends `Graph.Edge` with _required_
  `input`/`output`; `Connection` extends it with _optional_ `input`/`output`.
- **Hierarchy exists twice.** `plugin-explorer` has its own `TreeNodeType` with
  `children: string[]`; `react-ui-graph`'s cluster projector bolts `parent` onto synthetic
  nodes.

`parent` (child→parent) rather than `children[]` so multi-parent is structurally
unrepresentable, and because React Flow's `parentId` and ELK's
`hierarchyHandling: INCLUDE_CHILDREN` both want that direction.

Both fields are optional, so all 12 consumers / 37 import sites are unaffected.
`@dxos/graph` is published (v0.10.0, not private) → additive minor + changeset.

`GraphModel` gains `children(id)`, `ancestors(id)`, `roots()`.

What `project` returns is that graph plus the two things the renderer needs and the source
cannot supply — resolved geometry and a provenance map:

```ts
const Diagram = Schema.Struct({
  graph: Graph.Graph, // nodes/edges/parent/ports
  provenance: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
});
```

There is no separate `Group` entity: a group is a node whose ontology kind admits
children, which is also how React Flow models it (`type: 'group'`). One entity kind fewer
to keep consistent, and `parent` then covers both node-in-group and group-in-group.

**`parent` is not `subgraph`.** `ComputeNode.subgraph?: Ref<ComputeGraph>` is
hierarchy-by-reference — navigate into a separate graph. `parent` is inline containment
with children visible, which is what progressive zoom requires. The conductor dialect
flattens `subgraph` → `parent` at projection time.

### Dialect

```ts
type Dialect<Source> = {
  readonly id: string;
  readonly ontology: Ontology;
  readonly mode: 'readonly' | 'round-trip';
  project: (source: Source, overlay: Overlay) => Diagram;
  apply?: (source: Source, intent: Intent) => Effect.Effect<void, DialectError>;
};
```

`mode` is data, so the toolbar is honest by construction: a `readonly` dialect (code AST)
has no `apply`, so only overlay-affecting tools are offered. Round-trip dialects accept
lossy serialisation — permitted because the text format is strict.

**Write-back fidelity is not an architectural fork.** Because canonical text forbids
comments and free formatting, `print(parse(text)) === text` holds for well-formed input.
No CST, no trivia tracking; an AST plus a printer suffices. Fidelity becomes a per-dialect
property.

### Ontology

One declaration drives four consumers that would otherwise drift: the **toolbar**
(derived, so correct per DSL), **connection legality**, **ELK constraints**, and the **AI
tool schema**.

| Concern                          | Home                                                         |
| -------------------------------- | ------------------------------------------------------------ |
| Link connects Node→Node          | `Type.makeRelation({source, target})` — compile-time checked |
| Group contains Node/Group        | relation, or `parent`                                        |
| Arrow treatment, icon, label     | annotations on the kind                                      |
| "Inheritance links are vertical" | `LayoutAnnotation` → ELK                                     |
| Ports per side                   | annotation on the node kind; chosen port is edge data        |
| Cardinality / acyclicity         | predicate (`Schema.filter` or dialect `validate`)            |

Relational constraints belong in the schema, not a side table: `Type.makeRelation` embeds
`relationSource`/`relationTarget` as DXNs in the JSON Schema
(`Type.ts:226`, `internal/Entity/relation.ts:158`), so "what may I drag from this port?"
is a lookup over registered kinds, and the same declaration serialises to the JSON Schema
the AI path needs.

ECHO-backed dialects declare kinds with `Type.makeObject`/`makeRelation`. Dialects whose
instances are not ECHO objects (Mermaid spans, AST paths) use `Schema.Struct` plus an
`EndpointsAnnotation` carrying permitted kind ids. Both are read through one accessor.

Only cardinality/acyclicity is non-declarative, and predicates are what `filter` is for.

### Overlay

```ts
const Overlay = Schema.Struct({
  positions: Schema.Record({ key: Schema.String, value: Point }), // pinned only
  labels: Schema.Record({ key: Schema.String, value: Schema.String }),
  notes: Schema.Array(TextBlock),
  collapsed: Schema.Array(Schema.String),
});
```

Absent position ⇒ auto-layout. This is the only ECHO-persisted tier, because it is the
only one that needs CRDT sync. `CanvasBoard` already validates the split:
`computeGraph: Ref<ComputeGraph>` (truth) + `layout: Graph.Graph`
("Graph of shapes positioned on the canvas").

### Edit flow

```
gesture → Intent → ontology validation
  ├─ representable ∧ round-trip → dialect.apply mutates source
  ├─ not representable (position, note, readonly label) → overlay write
  └─ illegal → reject with feedback
→ reproject
```

Reprojecting after either write keeps the source authoritative and prevents the diagram
from drifting into a private state the DSL does not describe.

### Layout

ELK (`elkjs`, already present transitively via `mermaid`), driven from ontology
annotations plus overlay pins: pinned nodes become fixed positions, ELK lays out the rest.
Relevant options: `elk.layered.crossingMinimization.strategy`, `elk.edgeRouting`
(`ORTHOGONAL`/`POLYLINE`/`SPLINES`), `nodePlacement.favorStraightEdges`,
`bk.edgeStraightening`, `unnecessaryBendpoints`, `hierarchyHandling=INCLUDE_CHILDREN`.
Edge sections (`startPoint`, `bendPoints[]`, `endPoint`) map onto React Flow edge paths.
Load via dynamic import; EPL-2.0 and ~1.5MB, so it must not enter the base bundle.

## Packages

| Package                   | Change                                                                      |
| ------------------------- | --------------------------------------------------------------------------- |
| `@dxos/graph`             | extend: `Node.parent`, `Edge.sourcePort`/`targetPort`, `GraphModel` helpers |
| `react-ui-canvas`         | keep — substrate-independent viewport/projection wrapper                    |
| `react-ui-diagram`        | **new** — React Flow renderer, ontology-driven toolbar, intents             |
| `react-ui-canvas-editor`  | **remove** once conductor migrates                                          |
| `react-ui-canvas-compute` | port 25 shapes to node kinds; drop the canvas coupling                      |
| `plugin-illustrator`      | owns the dialect contract + Mermaid dialect                                 |
| `plugin-conductor`        | ComputeGraph dialect; renders via `react-ui-diagram`                        |

Named `react-ui-diagram`, not `react-ui-flow`: naming the package after React Flow
re-couples what the neutral model exists to decouple, and "flow" under-describes UML class
diagrams and code structure.

The dialect contract lives in `plugin-illustrator` as the headless host, following the
established Game → Chess/TicTacToe pattern already used for tldraw/excalidraw variants.

## Testing

The tier boundaries are what make this testable:

- **Round-trip property:** `print(parse(text)) === text` for canonical text dialects.
- **Projection goldens:** source → `Diagram` snapshots, no renderer involved.
- **Intent matrix:** each `Intent` × each `mode` → expected source vs overlay mutation.
- **Ontology:** illegal connections rejected before the source is touched.
- **Renderer stories:** fed a hand-written `Diagram`, no DSL involved — this is the test
  that proves the decoupling.

Failure modes: parse errors surface as canvas diagnostics and hold the last good
projection rather than blanking; ontology violations are rejected pre-write; a failed
`apply` leaves the source untouched.

## Phasing

1. Extend `@dxos/graph` (`parent`, ports, `GraphModel` helpers) + changeset.
2. Neutral model, `Dialect` contract, ontology accessor, `Overlay` — headless, tested
   without a renderer.
3. `react-ui-diagram`: React Flow renderer over the neutral model, stories fed
   hand-written diagrams. Groups via `parentId`/`extent`, ports, snap.
4. Mermaid dialect: span-aware parser (replacing the current position-discarding one),
   canonical printer, round-trip property test.
5. ELK layout behind dynamic import, driven by ontology annotations + pins.
6. Ontology-derived toolbar and connection validation.
7. Conductor dialect over `ComputeGraph`; flatten `subgraph` → `parent`; port compute
   shapes; delete `react-ui-canvas-editor`.
8. Read-only AST dialect to prove `mode: 'readonly'`.

## Open questions

- **Union endpoints.** `Type.makeRelation` takes a single `source`/`target`; a link
  admitting several node kinds needs either a shared base type or widening to
  `Obj.Unknown` plus a predicate. Neither is clean.
- **Progressive zoom semantics.** Level-of-detail (which compartments render at which
  zoom) is custom work in React Flow; the interaction model is not yet specified.
- **Large graphs.** React Flow is DOM-based; beyond ~1–2k nodes needs virtualisation.
  Not a near-term constraint but it bounds the substrate.
- **Existing scene DSL.** `plugin-illustrator`'s `Scene.Command` DSL and the
  tldraw/excalidraw builders serve whiteboard rendering. Whether they survive alongside
  this or are retired with `plugin-tldraw`'s move out of the monorepo is undecided.
