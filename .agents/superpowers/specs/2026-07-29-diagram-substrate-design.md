# Constrained diagramming substrate

Date: 2026-07-29
Status: design approved; `react-ui-diagram` spike built and verified (see Spike below)

A diagramming layer that renders technical drawings projected from a source-of-truth DSL,
allows constrained editing that writes back to that DSL, and replaces
`react-ui-canvas-editor` as the substrate for `plugin-conductor`.

## Problem

`plugin-illustrator` can compile Mermaid to a scene and hand it to a whiteboard renderer
(tldraw, excalidraw). That is the wrong shape for technical drawings:

- The whiteboard owns an open document, so "constrained" can only be achieved by removal.
- Neither renderer models ports, so links attach to shape centres.
- Nothing ties a rendered node back to the source it came from, so edits cannot round-trip.

Separately, `plugin-conductor` sits on ~10.4k LOC of hand-rolled canvas code, excluding
tests and stories (`react-ui-canvas` 2.0k, `react-ui-canvas-editor` 4.6k,
`react-ui-canvas-compute` 3.8k) that has no group/hierarchy support.

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

D3 was rejected: it is a toolkit, not a substrate — it is what the hand-rolled canvas code
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

### Neutral representation: rewrite `@dxos/graph`

The neutral model is not a new package — `@dxos/graph` (663 LOC excluding tests) is the
right home. But it should be **rewritten**, not extended. Two independent reasons.

**1. Its persisted footprint is exactly what we are replacing.** `Graph` is an ambiguous
name in this repo; three unrelated things carry it. Only two consumers persist the real
`@dxos/graph`, and both are the types this work replaces:

| Consumer                         | Uses                                                   | Persisted                |
| -------------------------------- | ------------------------------------------------------ | ------------------------ |
| `conductor`                      | `ComputeNode`/`ComputeEdge` extend `Graph.Node`/`Edge` | **yes** — `ComputeGraph` |
| `react-ui-canvas-editor`         | `CanvasBoard.layout: Graph.Graph`                      | **yes** — `CanvasBoard`  |
| `react-ui-graph` (13 projectors) | `type Graph` only — d3, in-memory                      | no                       |
| `sdk/schema`                     | builds a `GraphModel` from ECHO at runtime             | no                       |
| `plugin-explorer`                | `SelectionModel` + in-memory adapter                   | no                       |
| `react-ui-canvas-compute`        | tests only                                             | no                       |

`plugin-explorer`'s own `org.dxos.type.graph` (`{name, view, query}`) and
`plugin-script`'s `Notebook.graph` reference _that_, not `@dxos/graph`;
`react-ui-menu` and `plugin-graph` use `@dxos/app-graph`, a third unrelated `Graph`. So
there is no external migration burden.

**2. The current design is already fighting itself.**

- `data: Schema.optional(Schema.Any)` is dead weight: both real consumers bypass it via
  `Schema.extend`, so there are two competing extension mechanisms and the typed one needs
  casts — `graph as Graph.Graph<S, Connection>` in `CanvasGraphModel`.
- The author flagged this: `Shape` does `Graph.Node.pipe(Schema.omit('type'))` with
  `// TODO(burdon): Breaks graph contract?`.
- `createEdgeId`/`parseEdgeId` is buggy. Ids join on `_` and split on `_`, while
  `KEY_REGEX = /\w+/` admits `_` and is unanchored, so
  `createEdgeId({source: 'a_b', target: 'c'})` → `'a_b__c'` reads back as
  `source: 'a', relation: 'b', target: ''`.
- `GraphModel` is mutation-oriented (`ReadonlyGraphModel` → `GraphModel` →
  `ReactiveGraphModel` + `Builder`), the wrong grain for a projection/intent architecture.

**Rewrite, preserving structural compatibility.** Keep the field names
(`id`/`type`/`nodes`/`edges`/`source`/`target`) so the 13 read-only projectors and
`sdk/schema` need at most an import change. Changes:

```ts
// Node: inline containment. A group is a node whose kind admits children.
parent: Schema.optional(Schema.String),

// Edge: named attachment points — replaces ComputeEdge.input/output and Connection.input/output.
sourcePort: Schema.optional(Schema.String),
targetPort: Schema.optional(Schema.String),
```

- Drop `data: Any`; make the node/edge payload a **schema parameter** so extension is
  first-class instead of `Schema.extend` plus a cast.
- Drop `createEdgeId`/`parseEdgeId`; edge ids become opaque, with `relation` an explicit
  field rather than something packed into the id.
- Separate the immutable projection type from the mutable model: the diagram layer consumes
  a plain immutable `Graph`; `GraphModel` survives for the existing mutation consumers and
  gains `children(id)`, `ancestors(id)`, `roots()`.

`parent` (child→parent) rather than `children[]` so multi-parent is structurally
unrepresentable, and because React Flow's `parentId` and ELK's
`hierarchyHandling: INCLUDE_CHILDREN` both want that direction.

At `0.10.0` the breaking change lands in a minor, so it does not cascade a major through
the fixed publish group.

What `project` returns is that graph plus the two things the renderer needs and the source
cannot supply — resolved geometry and a provenance map:

```ts
const Projection = Schema.Struct({
  graph: Graph.Graph, // nodes/edges/parent/ports
  provenance: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
});
```

Named for the operation, not the artifact, so it does not collide with the `Diagram`
component — a collision the spike hit immediately.

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
  project: (source: Source, overlay: Overlay) => Projection;
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

## Affected packages

LOC excludes tests and stories. "Impact" is the expected scale of change, not a promise.

| Package                         | LOC  | Relationship                         | Impact                                                                                                       |
| ------------------------------- | ---- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `@dxos/graph`                   | 663  | neutral representation               | **rewrite** — parameterised payload, `parent`, ports; drop `data: Any` + `createEdgeId`; keep field names    |
| `react-ui-diagram`              | —    | **new**                              | React Flow renderer, ontology-driven toolbar, intent dispatch                                                |
| `react-ui-canvas-editor`        | 4631 | current conductor substrate          | **delete** once conductor migrates; `CanvasBoard`/`Shape`/`Connection` superseded                            |
| `react-ui-canvas-compute`       | 3767 | 25 compute shapes                    | **port** shapes to node kinds; drop the canvas coupling. Largest single migration                            |
| `core/compute/conductor`        | 3114 | owns `ComputeGraph`                  | **moderate** — `ComputeEdge.input`/`output` become core ports; `subgraph` flattens to `parent` at projection |
| `plugin-conductor`              | 307  | thin shell                           | **small** — renders via `react-ui-diagram`; add the ComputeGraph dialect                                     |
| `plugin-illustrator`            | 1836 | dialect host                         | **moderate** — owns the dialect contract; Mermaid parser becomes span-aware                                  |
| `react-ui-canvas`               | 1961 | viewport/projection                  | **keep** — substrate-independent                                                                             |
| `react-ui-graph`                | 7106 | 13 d3 projectors, in-memory          | **low** — read-only structural use; import churn only, if field names hold                                   |
| `sdk/schema`                    | 3398 | builds `GraphModel` from ECHO        | **low** — runtime projection, not persisted                                                                  |
| `plugin-explorer`               | 2602 | `SelectionModel` + in-memory adapter | **low** — its own `org.dxos.type.graph` is unrelated                                                         |
| `react-ui-board`                | 2131 | second React Flow consumer           | **none required** — candidate to converge later                                                              |
| `plugin-script`                 | 6093 | `Notebook.graph`                     | **none** — refs plugin-explorer's type, not `@dxos/graph`                                                    |
| `react-ui-menu`, `plugin-graph` | —    | `@dxos/app-graph`                    | **none** — unrelated `Graph`                                                                                 |

Net: ~8.4k LOC deleted or ported (`react-ui-canvas-editor` + `react-ui-canvas-compute`)
against one new renderer package, with the `react-ui-graph` / `sdk/schema` /
`plugin-explorer` cluster insulated by keeping field names stable.

Named `react-ui-diagram`, not `react-ui-flow`: naming the package after React Flow
re-couples what the neutral model exists to decouple, and "flow" under-describes UML class
diagrams and code structure.

The dialect contract lives in `plugin-illustrator` as the headless host, following the
established Game → Chess/TicTacToe pattern already used for tldraw/excalidraw variants.

## Testing

The tier boundaries are what make this testable:

- **Round-trip property:** `print(parse(text)) === text` for canonical text dialects.
- **Projection goldens:** source → `Projection` snapshots, no renderer involved.
- **Intent matrix:** each `Intent` × each `mode` → expected source vs overlay mutation.
- **Ontology:** illegal connections rejected before the source is touched.
- **Renderer stories:** fed a hand-written `Projection`, no DSL involved — this is the test
  that proves the decoupling.

Failure modes: parse errors surface as canvas diagnostics and hold the last good
projection rather than blanking; ontology violations are rejected pre-write; a failed
`apply` leaves the source untouched.

## Spike (built 2026-07-29)

`packages/ui/react-ui-diagram` exists and is verified in storybook. It proves the tier
boundaries before any migration is attempted; it is not yet the finished package.

Built:

- Neutral model (`src/types/diagram.ts`) — `Node`/`Edge`/`Graph` with `parent` and
  `sourcePort`/`targetPort`, plus `Port`, `Compartment`, `Overlay`, `Projection`. Lives here
  pending the `@dxos/graph` rewrite; the field names are the ones that rewrite preserves.
- Hierarchy-aware layered layout (`src/model/layout.ts`) — cycle-safe ranking, groups sized
  to their contents, parent-relative coordinates, pinned overlay positions winning over
  computed ones.
- React Flow renderer (`src/components/Diagram/`) — groups via `parentId` + `extent`,
  compartments and ports as ordinary DOM, snap to grid.
- Mermaid projection (`src/testing/mermaid.ts`) — a **story fixture**, not the dialect: the
  real one belongs in `plugin-illustrator` with a span-aware parser and a canonical printer.
- Two stories: `Default` (mermaid source | live projection, two columns) and `Neutral` (a
  hand-written `Projection`, no DSL — the decoupling test).
- 13 tests: projection goldens, ranking/back-edge behaviour, group insetting, overlay pins,
  and termination on fully-cyclic and self-parented graphs.

Three bugs the spike surfaced that the design had not anticipated:

1. **A port needs both a source and a target handle.** React Flow resolves an edge end by
   (id, type) and _silently drops_ the edge when no handle of the matching type exists.
   Legality belongs to the ontology, so every port renders both.
2. **Edges must be lifted to the level being ranked.** `X --> A` reaches into a group, so
   ranking the root level against only root-level edges sees no edges at all and collapses
   X / CORE / Y into one row. Each level ranks against edges re-expressed in terms of that
   level's entities.
3. **`Diagram` collided with itself** — the model type and the component wanted the same
   name; hence `Projection`.

Deliberately not done: write-back (`apply`), the ontology and the toolbar it drives, ELK,
and progressive-zoom LOD. Edges are beziers through group interiors, which orthogonal
routing addresses.

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
