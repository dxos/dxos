# ECHO Lenses — Design

Interact with an ECHO object through a **lens** — a declared, bidirectional view of its
shape — instead of through its base type. Fields the lens exposes that have no counterpart
in the base type persist in the object's ECHO annotation dictionary.

Status: **design only**, nothing implemented. No PR.

The proof obligation, and the thing every deliverable is measured against: **a custom UI drives
the object entirely through the lens schema, while 100% of the data lands in the original object
under its original schema (plus annotations) — such that a second peer running the canonical UI
over the base type collaborates live with it, in both directions.**

## 1. Motivation

An ECHO object has exactly one type today (`Type.makeObject` + a typename@version DXN), and
every consumer — form, table, agent tool, connector — sees that one shape. In practice we keep
re-deriving other shapes from it:

- `View`/`Projection` (`@dxos/schema`) already re-shapes a type for presentation, but only by
  hiding/reordering properties and overriding JSON-schema annotations. It cannot rename, split,
  merge, convert values, or add a property the base type doesn't have.
- Connectors hand-write a mapper in, and a second hand-written mapper out. Nothing checks the
  two agree.
- Agents get the whole base schema, including properties irrelevant to the task, and write back
  through the same wide surface.

A lens is the missing abstraction: one declaration, two directions, laws that hold.

## 2. Why panproto

[panproto](https://github.com/panproto/panproto)'s layer 4 (`panproto-lens`) is exactly this: an
asymmetric lens as a `get` (source → view, dropping data into a **complement**) and a `put`
(view + complement → source), with `check_laws` mechanically verifying GetPut and PutGet. It
ingests ~47 schema languages (JSON Schema, OpenAPI, Protobuf, GraphQL, Avro, ATProto Lexicon,
SQL DDL), can `lens generate` a lens by diffing two schemas, and composes lenses.

Bindings: Rust crate, `@panproto/core` (WASM/TypeScript), Python, a CLI (`schema lens
generate|apply|verify|compose|inspect`), and an MCP server + Claude Code skills
(`panproto-toolkit`) — so lenses are also agent-authorable.

The interop boundary is JSON Schema, which we have both ways already:
`JsonSchema.toJsonSchema(type)` / `JsonSchema.toEffectSchema(json)` in `@dxos/echo`, plus
`Type.makeObjectFromJsonSchema`.

**But panproto is not the only implementation.** See §3.2 — the `Lens` interface is uniform, the
implementation is pluggable. The Task lens (§4.A) is a declarative panproto lens; the rich-text
lens (§4.B) is a hand-written codec that satisfies the same interface and is checked by the same
law harness. Pretending a markdown parser is a schema diff would be dishonest and would bend the
design out of shape.

**Unverified from docs, must be confirmed in Phase 0** (TS SDK surface, per the book):
`Panproto.init()` (loads WASM), `MigrationBuilder.map/.mapEdge/.resolve/.compile` →
`CompiledMigration.lift/.get/.put`, `LensHandle.get/.put/.checkLaws/.toJson`,
`Panproto.composeLenses`, `Panproto.parseJson/.toJson/.convert`, and `get()` returning
`GetResult { view, complement }`.

## 3. Model

### 3.1 The lens

```
Lens = { source: TypeDXN, target: JsonSchema, spec: LensSpec }
get : Source              -> { view: Target, complement: Complement }
put : Target, Complement  -> Source
```

Two ways a lens exists, and we want both:

1. **Code-defined** — a lens shipped in a package and registered at startup (the built-ins in
   §4). Versioned with the code, unit-tested, no space round-trip.
2. **ECHO-stored** — a `Lens` object in a space, so a user or an agent can author and share one.
   Mirrors how stored `Type` entities already work.

Proposed ECHO type (`org.dxos.type.lens`):

```ts
Schema.Struct({
  name: Schema.optional(Schema.String),
  source: Schema.String,               // typename@version of the base type
  target: internal.JsonSchemaType,     // the lensed shape (JSON Schema)
  spec: Schema.Unknown,                // declarative lens spec, or a coded-lens identifier
  overlayPolicy: Schema.optional(...), // see §3.4
})
```

`target` is stored rather than derived so a lens keeps working where the engine isn't loaded —
forms and tables need the shape even where `put` is unavailable.

### 3.2 Two implementations, one interface

- **Declarative lens** — a panproto spec, compiled to `get`/`put` by the engine. Generated or
  hand-authored, law-checked by the engine. Task → GTD.
- **Coded lens** — a TypeScript module exporting the same `get`/`put`/`complement` shape,
  registered under a lens id. For transformations no schema diff can express: parsing, tree
  construction, serialization. Text → rich text.

Both register in the same registry, both are exercised by the same law-check harness, and no
consumer knows which kind it holds.

### 3.3 Read and write tiers

- **T1 — snapshot codec.** `get(obj)` returns a plain view; `put(view, obj)` writes it back in a
  single `Obj.update`. Read-modify-write. Fine for agent tools, import/export, and unit tests.
  **Not safe for concurrent editing** — see §3.5.
- **T2 — live, minimal-write.** Reads are derived reactively so the UI stays live; writes touch
  only the properties (or character ranges) the user's edit actually changed. **Required for
  every story in §5**, therefore required for the demo, therefore not an optimization to defer.

For a declarative structural lens, T2 comes from compiling the spec to a path→path table with
pointwise value codecs (rename, hoist, wrap, default, enum/scalar convert), driven by
`Obj.getValue`/`Obj.setValue`. Specs containing a non-pointwise op fall back to T1 and are
excluded from collaborative surfaces until they can be expressed pointwise.

For a coded lens over a string CRDT, T2 comes from `Text.splice(obj, path, start, deleteCount,
insert)` over the exact source range of the edited node — see §4.B.

### 3.4 Where the extra data lives

Two different things get conflated here; keep them separate.

**Complement** — base data that `get` dropped. Needs no storage in the normal case: the base
object is still in the database, so `put` re-reads it. Storage is only required when the view
travels away from the object (to an agent, to a peer, to an export) and is written back later.

**Overlay** — view properties with no counterpart in the base type. These _must_ persist, and
this is where they go: the object's **ECHO annotation dictionary**. `EntityMeta.annotations` is
an `Annotation.Dictionary` (`Record<Annotation.Key, unknown>`) on every entity, read/written via
`Annotation.get/set/update` and `Annotation.getDictionary/setDictionary`, with
`Annotation.atom`/`atomProperty` giving per-annotation reactivity — so an overlay field is as
live, and as collaborative, as a real property.

```ts
const LensOverlay = Annotation.make({
  id: 'org.dxos.annotation.lens.overlay',
  schema: Schema.Record({ key: Schema.String, value: Schema.Unknown }), // lensDxn -> { prop: value }
});
```

Rules:

- Keyed by lens DXN, then by property — two lenses never collide, and dropping a lens drops its
  overlay cleanly.
- Every overlay value is validated against that property's schema in the lens `target` before it
  is written. An overlay is not an escape hatch for untyped data.
- Overlay properties are **second-class by construction**: not queryable, not indexed, invisible
  to consumers that haven't loaded the lens. The moment a field needs to be queried it should be
  **promoted** into the base type.
- `overlayPolicy` decides what happens to a view property that is neither mapped nor declared
  overlay-able: `reject` (default, the write throws) or `store`.

### 3.5 Concurrency — why writes must be minimal

This is the constraint the collaboration stories impose, and it is load-bearing.

Automerge merges concurrent changes **per property** (and per character within a string). A
snapshot `put` assigns _every_ property of the base object, including ones the user never
touched. Two peers editing different fields of the same object concurrently would therefore
clobber each other: peer B's lensed write of an untouched `title` beats peer A's concurrent edit
to `title` under last-writer-wins, and A's edit vanishes.

So the rule is: **a lens write assigns only what changed.**

- Structural lens → diff the view before/after, map the changed paths back through the table, and
  assign only those.
- Text lens → never rewrite `Text.content`; splice the changed source range.

A T1 snapshot `put` is still correct for single-writer contexts (agents, import), and it is what
the unit tests use. It just must not be what the UI calls.

### 3.6 Composition and identity

- Lenses compose, so `Task → GTD → LLM-tool-shape` is one chain. Compose at registration.
- A lens never changes object identity: `id`, refs, and relations are untouched, never lensed.
- Queries stay on the base type; a lens applies to results, post-query.

## 4. The two lenses

### A. `DataType.Task` → GTD task (declarative, structural)

`packages/sdk/types/src/types/Task.ts`. Small, fully unit-testable, and it exercises every
mechanism:

| Base (`Task`)                               | Lensed (GTD)                             | Op                                                              |
| ------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| `status: 'todo' \| 'in-progress' \| 'done'` | `done: boolean` + `stage`                | lossy split; complement carries the discarded distinction       |
| `priority: 'none'…'urgent'`                 | `priority: 1..5`                         | scalar convert, total both ways                                 |
| `estimate` (minutes)                        | `estimateHours`                          | unit convert — float round-trip fidelity is a real failure mode |
| `title`, `description`                      | unchanged                                | identity                                                        |
| —                                           | `context` (`@home`/`@work`), `waitingOn` | **overlay** → annotation dictionary                             |

The lossy `status` split is the interesting one: `done: false` alone cannot say whether the task
is `todo` or `in-progress`, so `put` needs the complement (or the live base value) to restore it.
That is the textbook lens law case and the reason to use a real lens engine rather than a pair of
hand-written functions.

### B. `DataType.Text` → rich text (coded, at the **Text object** level)

Per your call, the lens sits on `Text` (`org.dxos.type.text`, `content: string`), not on
`Document`. `Document` merely holds `content: Ref<Text>`, so lensing `Text` makes the lens reusable
for every text-bearing type and keeps the document's own properties (`name`, `history`) out of it.

- **Target shape** — a block tree: `{ blocks: [{ type: 'heading', level, children }, { type:
'paragraph', children: [{ type: 'text', value }] }, …] }`.
- **`get`** — parse `content` with remark → mdast → normalized block tree. `remark`,
  `remark-gfm`, and `mdast-util-to-hast` are already in the workspace catalog and used by
  `@dxos/react-ui-markdown`.
- **`put`** — and this is the key mechanism: **mdast nodes carry `position.start.offset` /
  `position.end.offset`**, the exact character range of that node in the source string. So a
  block edit serializes just that block to markdown and applies it as
  `Text.splice(text, ['content'], start, end - start, newMarkdown)`. Everything outside the
  edited range is untouched, which is what makes concurrent editing with a canonical CodeMirror
  peer actually merge instead of clobber.
- **Complement** — the source slice per node. Markdown is not canonical (`*` vs `-` bullets, ATX
  vs setext headings, wrap column, reference vs inline links), so a naive re-serialize rewrites
  the whole document and destroys every comment anchor in it. Holding the original slice means
  untouched blocks are reproduced byte-identically by construction, and only genuinely edited
  blocks are re-serialized.

**Scope guard for the lensed UI:** the demo interface is a **structured block list** — a typed row
per block (heading with a level control, paragraph with a plain text input, list with items) —
not a WYSIWYG editor. It proves lensed interaction without dragging in ProseMirror. A real
rich-text editing surface is a separate question, deliberately not answered here.

**Known-hard, scoped out of v1:** stable block identity across re-parses. Offsets shift under a
concurrent peer's edits, so block ids are ephemeral render keys derived per parse, not persistent
identifiers. The durable fix is Automerge cursors — the same anchoring `@dxos/react-ui-editor`
already uses for comments — and it belongs in a later phase.

_(The Organization → schema.org lens is dropped from the plan.)_

## 5. Stories — the deliverable

Two stories per lens, in a new `packages/stories/stories-lens` package (the repo already keeps
cross-cutting story packages under `packages/stories/*`).

### 5.1 Story 1 per lens — lensed UI + proof of persistence

A single peer. Three panes:

1. **Lensed UI** — a custom interface built _only_ against the lens `target` schema. It never
   imports `DataType.Task` / `DataType.Text`. For Task that is a `Form` rendered from the lens
   target; for Text it is the block list.
2. **Canonical UI** — the base-type interface (the standard `Form` for `Task`, the CodeMirror
   editor for `Text`), live on the same object.
3. **Raw inspector** — the base object's JSON _and_ `Obj.getMeta(obj).annotations`, live.

The inspector is the proof, and it is not decoration: it is what demonstrates that lensed edits
land as ordinary base-schema properties, and that overlay-only fields land in the annotation
dictionary and nowhere else. Every claim in this document is visible in that third pane.

### 5.2 Story 2 per lens — live collaboration across the lens boundary

Two peers, real replication. `withMultiClientProvider({ numClients: 2, createSpace: true })`
(`@dxos/react-client/testing`) already creates N clients, performs a genuine invitation into a
shared space, and lays the panes out side by side; `ClientStory` exposes `index` per pane, so the
story renders **the canonical UI in pane 0 and the lensed UI in pane 1** over the same object.

What each story must demonstrate, in both directions:

- Peer A sets `status: 'in-progress'` on the canonical form → peer B's lensed UI updates to
  `done: false`, `stage: 'in-progress'` without a reload.
- Peer B toggles `done` in the lensed UI → peer A's canonical form shows `status: 'done'`.
- Peer B sets an **overlay** field (`context: '@work'`) → it persists, survives reload, is
  invisible on A's canonical form, and appears in A's raw inspector under `meta.annotations`.
- **Concurrent, non-conflicting edits merge**: A edits `title` while B edits `done`; both
  survive. This is the assertion that fails if §3.5 is violated, and it is the single most
  valuable test in the plan.
- For Text: A types in the CodeMirror editor while B edits a _different_ block in the block list;
  both edits survive and the untouched markdown is byte-identical.

These are storybook `play` functions, not just visual stories, so CI actually enforces them.

## 6. Risks and open questions

1. **WASM in our runtime.** `@panproto/core` is a WASM build. Unknown: bundle size, whether it
   loads in the shared worker / `workerd` where ECHO runs, and cold-start cost. Gates the
   architecture → Phase 0. Fallback: implement the structural subset natively in TypeScript (a
   path table plus value codecs — small) and use panproto only at author time via CLI/MCP to
   generate and law-check specs that ship as JSON. **The fallback still delivers both lenses and
   all four stories**, since the text lens is coded regardless.
2. **Reactivity composition.** The lensed view's atom must compose base-property atoms
   (`Obj.atom`) with overlay atoms (`Annotation.atom`) without over-firing. Fiddly, and the collab
   stories will expose it immediately.
3. **Write minimality** (§3.5) — the correctness risk, covered by the concurrent-edit test.
4. **Block identity under concurrent edits** (§4.B) — scoped out, needs Automerge cursors.
5. **Validation.** A `put` validates against the base type before writing; a lens is not a bypass.
6. **Versioning.** A lens pins `source` to `typename@version`; policy needed for when the base
   type migrates out from under it.
7. **Overlay sprawl.** Overlay fields are invisible to queries and indexes; without a promotion
   path they become a shadow schema.

## 7. Proposed layout

- `packages/sdk/lens` — `@dxos/lens`, `"private": true`. Deps `@dxos/echo`, `@dxos/effect`,
  `@dxos/schema`; `@panproto/core` optional/lazy.
  - `Lens.ts` (ECHO type + interface), `codec.ts` (T1), `live.ts` (T2 minimal-write),
    `overlay.ts` (annotation storage), `engine.ts` (panproto binding), `registry.ts`.
  - `lenses/task-gtd.ts` (declarative), `lenses/rich-text.ts` (coded).
- `packages/stories/stories-lens` — the four stories and the two custom UIs, plus the shared raw
  inspector component.
- No plugin until the stories prove the UI story is worth shipping.

## 8. References

- panproto — https://github.com/panproto/panproto · book https://panproto.dev/book/ ·
  `panproto-lens` https://docs.rs/panproto-lens/latest/panproto_lens/ ·
  toolkit https://github.com/panproto/panproto-toolkit
- DXOS: `packages/sdk/react-client/src/testing/withClientProvider.tsx`
  (`withMultiClientProvider`, real invitations), `packages/sdk/schema/src/projection/projection.ts`,
  `packages/core/echo/echo/src/{Annotation,Text,Type,JsonSchema,Obj}.ts`,
  `packages/core/echo/echo/src/internal/common/types/meta.ts` (`EntityMetaSchema.annotations`),
  `packages/sdk/types/src/types/Task.ts`, `packages/sdk/schema/src/types/Text.ts`.
