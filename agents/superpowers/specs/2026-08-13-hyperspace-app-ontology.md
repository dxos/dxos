# Hyperspace — Data and App Ontology

- **Date:** 2026-08-13
- **Status:** Outline (working vocabulary)
- **Companions:** `2026-08-06-scenes-app-ontology-design.md` (composition
  direction), `packages/reflect/deus/lang/app.mdl` (the DEUS dialect that makes
  the app ontology declarable), `packages/plugins/plugin-inbox/PLUGIN.mdl`
  (first full description of a real plugin in that dialect).

Two ontologies, one discipline: every layer is **data that drives machinery**,
not code that hides structure. The data ontology says what exists; the app
ontology says how it is presented and acted on. DEUS (`.mdl`) is the
specification surface that describes both.

## 1. Data ontology

```text
Hyperspace ──── graph of Spaces
  Space ─────── graph of Objects (and Relations)
    Schema ──── shape + meaning of Objects; Views project them
    Feeds ───── append-only streams of immutable Objects
```

### Hyperspace = Graph of Spaces

The universe of a user (and of the network) is not one database but a graph of
spaces. Spaces reference each other's contents through `Ref`/`DXN` — a `Ref`
can cross a space boundary the way a hyperlink crosses a host — so the spaces
themselves form a graph whose edges are cross-space references. Replication
and access control operate at this layer (subduction policies decide which
documents flow where; EDGE serves as the always-on peer). `Hyperspace` is the
emerging name for this layer's client surface (see the `Reconcile under
Hyperspace` intent in `@dxos/client`).

- **Unit:** Space (an authorization + replication boundary).
- **Edges:** cross-space `Ref`s (DXN-addressed).
- **Operations:** create/join/share a space; resolve a DXN; replicate.

### Space = Graph of Objects

Within a space, data is a graph of ECHO objects and typed relations —
CRDT-backed (Automerge), offline-first, reactively queryable. Objects are
addressed by id/DXN; `Ref`s and `Relation`s are the edges; queries (a
serializable `QueryAST`) select subgraphs; the app-graph and every list in the
UI are projections of this graph.

- **Unit:** Object / Relation.
- **Edges:** `Ref` (ownership or association), `Relation` (typed, first-class).
- **Operations:** ECHO queries (`Query`/`Filter`, data all the way down),
  mutation via typed objects, subscription via atoms.

### Schema

Objects carry types: Effect Schema definitions registered as ECHO types, with
annotations driving meaning and presentation (labels, formats, form behavior).
Two derived artifacts matter to the app ontology:

- **`View`** — a persisted object pairing a serialized query (`query.ast`)
  with a projection (field list) — the reusable "what data, which fields"
  binding that tables, kanban, forms, and (next) Scenes consume.
- **Projections** (`ProjectionModel`) — the mediation between stored views
  and UI field/format metadata.

### Feeds

Append-only streams of immutable objects — the ingestion shape for external
reality (mail, calendar, transcripts, crawls). Feed members are queryable
like space objects (scoped queries) but never mutate; mutable adjuncts
(tags, state) live in sidecar objects (e.g. `TagIndex`) keyed by member id.
Feeds make sync idempotent and history durable.

## 2. App ontology

```text
Deck ──────── planks + companions, driven by the app-graph
  Plugin ───── contributes graph nodes, containers/views, operations
    Container/View ─ presents Objects (queries/Views); state machines
      Component ──── behavior as a state machine; renderer-thin
```

### Deck (navigation)

The deck is the system-level composition: an ordered set of **planks**, each
of which is _just an app-graph node id_. Content resolves through one Surface
dispatch (`article` role, subject = the node's data); **companions** are child
nodes (`~variant` linked segments) rendered as an attached plank;
**level chains** (`mailbox > message > attachment`) declare how reading down
a hierarchy reuses planks. Navigation state (active planks, sizes, companions)
is plain data (`DeckState`); navigation changes are operations
(`LayoutOperation.Open/Close/…`).

- **Driven by:** the app-graph — nodes, connectors, actions, companions —
  itself an atom-reactive projection over ECHO + capabilities.
- **DEUS terms:** `node`, `deck`, `plank`, `companion` (see `app.mdl`).

### Plugins (contribution)

A plugin is a bundle of contributions: ECHO types, app-graph builders
(nodes/folders/companions for its types), **containers/views** (article,
section, card surfaces), **operations** (the only way behavior enters the
system — typed, invocable, composable), skills, and settings. A plugin's
containers own presentation; their interactive state is (direction:)
**state machines** rather than ad-hoc hooks, and their behavior is declared
in the plugin's `PLUGIN.mdl`.

- **Driven by:** capabilities (contribution registry), Surface resolution
  (role + subject-type filters), operations (action layer).
- **DEUS terms:** `surface`, `menu`, `op`, `service`, `feat`, `test`.

### Components (behavior)

The leaves: reusable UI components whose interactive behavior is a
**framework-agnostic state machine** (the zag.js shape — machine +
per-renderer `connect()`), whose reactive state lives in atoms, and whose
contract is declared as an MDL `component` block. Structure (Scenes), state
(atoms), behavior (machines), and specification (MDL) are then four views of
one declarative system — with React (or any renderer) reduced to the last
mile.

- **Driven by:** machines + atoms; theme tokens for presentation.
- **DEUS terms:** `component` (existing dialect).

## 3. The correspondence

| Layer          | Data that drives it                                   | Declared as (MDL)                    |
| -------------- | ----------------------------------------------------- | ------------------------------------ |
| Hyperspace     | spaces, cross-space Refs, replication policy          | (future: `space` dialect)            |
| Space graph    | objects, relations, queries                           | `type`, `db`                         |
| Schema / Views | Effect Schema, annotations, `View{query, projection}` | `type`                               |
| Feeds          | append-only queues + sidecars                         | `type` (+ prose)                     |
| Deck           | app-graph nodes, `DeckState`, level chains            | `node`, `deck`, `plank`, `companion` |
| Plugin         | capabilities, surfaces, operations                    | `surface`, `menu`, `op`, `service`   |
| Container/View | queries/Views + machines                              | `component`, (next: Scenes)          |
| Component      | machine + atoms                                       | `component`                          |

The through-line: **everything above the renderer is data**, and DEUS is the
language in which that data's _intent_ is written down — enumerable by agents,
lintable by tools, and (with the app dialect) now covering navigation and
composition, not only types and behavior.
