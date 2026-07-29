# ECHO Lenses — Design

Interact with an ECHO object through a **lens** — a declared, bidirectional view of its
shape — instead of through its base type. Fields the lens exposes that have no counterpart
in the base type persist in the object's ECHO annotation dictionary.

Status: **design only**, nothing implemented. No PR.

Two goals, both load-bearing:

1. **First-class.** A lens is an ECHO concept alongside `Type` — definable statically in code or
   persisted in a space, resolved through a registry, with the same static/dynamic duality types
   already have.
2. **Derived, not hand-written.** Everything computable is computed: the target type from the
   lens, the overlay set from the mapping, the write path from the spec, the test instances from
   the schema. §3 grades each of these honestly, including the one that doesn't fully work.

The proof obligation: **a custom UI drives the object entirely through the lens schema, while
100% of the data lands in the original object under its original schema (plus annotations) — such
that a second peer running the canonical UI over the base type collaborates live with it, in both
directions.**

## 1. Motivation

An ECHO object has exactly one type today (`Type.makeObject` + a typename@version DXN), and
every consumer — form, table, agent tool, connector — sees that one shape. In practice we keep
re-deriving other shapes from it:

- `View`/`Projection` (`@dxos/schema`) re-shapes a type for presentation, but only by
  hiding/reordering properties and overriding JSON-schema annotations. It cannot rename, split,
  merge, convert values, or add a property the base type doesn't have.
- Connectors hand-write a mapper in, and a second hand-written mapper out. Nothing checks the
  two agree.
- Agents get the whole base schema, including properties irrelevant to the task, and write back
  through the same wide surface.

A lens is the missing abstraction: one declaration, two directions, laws that hold.

## 2. First-class in ECHO

ECHO already has exactly the duality a lens needs, and we should mirror it rather than invent a
parallel mechanism: a type is either **static** (`Type.makeObject(...)`, compile-time TypeScript
types) or **stored** (`Type.Type`, the meta-schema entity holding `{ typename, version,
jsonSchema }`, persisted with `db.addType()`, queried via `Filter.type(Type.Type)`, materialized
at runtime with `Type.makeObjectFromJsonSchema`). Static gets you autocomplete; stored gets you
user-authored schemas at the cost of dynamic typing. That tradeoff is already understood by
everyone who uses ECHO, and lenses inherit it unchanged.

Proposed surface, shaped as a namespace module like `Type` / `Obj` / `View`:

```ts
Lens.make(...)                       // static, code-defined
Lens.Lens                            // ECHO entity for persisted lenses (cf. Type.Type)
Lens.derive(baseType, lens)          // -> Type entity for the lensed shape   (§3, D1)
Lens.generate(baseType, targetType)  // -> draft spec + unresolved holes      (§3, D3)
Lens.checkLaws(lens, instances)      // property-based verification            (§3, D4)
Obj.lens(obj, lens)                  // live lensed handle: reactive reads, minimal writes
```

Registry: stored lenses resolve out of the space by source typename, exactly as stored types do.

### 2.1 Where the code lives — and what must stay out of core

`@dxos/echo` must not grow a WASM dependency; it runs in the shared worker and in every bundle.
So the split is:

- **`@dxos/echo`** — the `Lens` interface, the `Lens` ECHO entity, derivation, the registry, and
  the read/write tiers. No heavy deps: derivation is JSON Schema in, JSON Schema out.
- **Optional engine package** — the panproto/WASM binding, registered at startup by whoever wants
  declarative lens compilation and generation. Absent, static and coded lenses still work.
- **Coded lenses live with their dependencies** — the rich-text lens needs remark, so it ships in
  its own package, not in core.

**Staging, stated plainly:** this gets prototyped in `packages/sdk/lens`, not committed straight
into `@dxos/echo`, because the model should be proven by the two lenses and four stories before it
becomes API surface anyone depends on. It is shaped as a namespace module from day one so
promotion into core is a move plus a call-site update (two stories), not a redesign. Promotion is
a tracked task, not a someday.

## 3. What can be derived

The interesting question, graded honestly. D1 and D4 work and carry the design; D2 works with one
forced compromise; D3 does not work as inference and works well as propose-and-verify.

### D1. base type + lens → **derived target type**. Yes — this is the backbone.

A lens spec is a morphism on schemas, so applying it to the source's JSON Schema _yields_ the
target's JSON Schema. The whole path already exists:

```
JsonSchema.toJsonSchema(Task) ──spec──▶ target JSON Schema ──▶ Type.makeObjectFromJsonSchema(...)
```

The result is a real ECHO `Type` entity that forms, tables, and validation consume like any other.
**Nobody hand-writes the derived type.** Consequences worth stating:

- The lens `spec` is the single source of truth. The `target` field on a stored `Lens` becomes a
  materialized **cache** — kept so a lens still renders where the engine isn't loaded — and CI
  asserts the cache equals a fresh re-derivation. It is never edited by hand.
- Change the base type, re-derive; the target follows. That's the thing hand-written derived types
  can never do.

### D2. **Static TypeScript types** for the derived shape. Partly — and the compromise is TS's, not ours.

- **Persisted lens** — the spec is runtime data (JSON in a space). TypeScript cannot infer a type
  from a runtime value, full stop. The derived type is dynamic, consumers get JSON-Schema-driven
  forms rather than autocomplete. This is _exactly_ the existing tradeoff for stored types, so it
  costs nothing new conceptually.
- **Static lens** — achievable with a typed combinator builder, where each combinator carries a
  type-level transform and emits the same spec data as its runtime value:

  ```ts
  const GtdLens = Lens.make(DataType.Task)
    .rename('estimate', 'estimateHours')
    .convert('estimateHours', minutesToHours)
    .overlay('context', ContextSchema);
  // typeof Lens.Target<typeof GtdLens> is inferred
  ```

  You get compile-time target types _and_ a runtime-derivable spec from one declaration. Cost: the
  combinator types are gnarly, and they only cover ops the builder expresses.

**Recommendation:** build runtime derivation (D1) first and add the typed builder for the static
path once the op set has settled. The op set must be driven by the two lenses, not by what is
convenient to type in TypeScript.

### D3. base type + target type → **derive the lens**. Not as inference. Yes as propose-and-verify.

Your instinct is right, and it's worth being precise about _why_, because the failure is
structural rather than a matter of a better algorithm.

**What a schema diff genuinely recovers** (panproto ships `lens generate` for this): identity
correspondences; renames of same-typed properties; properties only in the source (⇒ drop into the
complement); properties only in the target (⇒ default or overlay). On _our_ schemas it can do
better than on generic JSON Schema, because `FormatAnnotation` and `PropertyMetaAnnotationId`
carry machine-readable semantics — `SingleSelect` with its option set, formats like URL/GeoPoint —
so enum correspondences and format conversions are recoverable rather than guessed.

**What no diff can recover: value semantics.** Nothing in the two schemas says that
`done === (status === 'done')` rather than `status !== 'todo'`. Nothing says
`estimateHours = estimate / 60` — both sides are just `number`. And those two are precisely the
interesting content of the Task lens (§5.A), which is a useful reality check on how much
generation can actually carry.

So generation should emit a **draft with explicit holes** and refuse to be law-valid until they're
filled. That reframes it from an oracle into a scaffolding tool, which is a thing that works:

- The holes are exactly where an LLM is useful, and panproto already ships an MCP server and
  Claude Code skills aimed at it. Property names, `title`s, and descriptions are the hints.
- The holes are also a finding about _our_ schemas: `estimate` records no unit, so no tool —
  human, statistical, or otherwise — can infer the factor 60. Richer annotations make more of the
  lens derivable. That is actionable independent of this project.

**And the verification half is what makes a proposed lens trustworthy**, which is where this stops
being hand-waving: propose cheaply, then verify mechanically with `checkLaws` over instances
generated from the source type's own `GeneratorAnnotation`s (`createProps` /
`createObjectFactory` in `@dxos/schema/testing`) — `DataType.Task` already annotates every
property with a generator. Property-based lens verification, zero fixtures written. We cannot
derive the semantics, but we can make a wrong guess fail loudly and immediately, which is most of
the value.

### D4. Also derived, and cheaply

- **The overlay property set** — the target properties the spec doesn't map from source. No
  hand-maintained list; `overlayPolicy` shrinks to a policy rather than an enumeration.
- **The T2 write path** — the path→path table compiled from the spec (§6.3).
- **Law-check instances** — from `GeneratorAnnotation`, per D3.
- **The UI** — forms and tables are already schema-driven, so they render the derived target with
  no lens-specific code. The custom UIs in §7 are custom because we _want_ to demonstrate a
  bespoke interface, not because a generic one is impossible.

## 4. Why panproto, and why it isn't the only implementation

[panproto](https://github.com/panproto/panproto)'s layer 4 (`panproto-lens`) is an asymmetric lens:
`get` (source → view, dropping data into a **complement**) and `put` (view + complement → source),
with `check_laws` mechanically verifying GetPut and PutGet. It ingests ~47 schema languages
(JSON Schema, OpenAPI, Protobuf, GraphQL, Avro, ATProto Lexicon, SQL DDL), composes lenses, and
provides the `lens generate` half of D3. Bindings: Rust, `@panproto/core` (WASM/TypeScript),
Python, a CLI, and an MCP server + Claude Code skills.

The interop boundary is JSON Schema, which we have both ways already
(`JsonSchema.toJsonSchema` / `toEffectSchema`, `Type.makeObjectFromJsonSchema`).

**But the `Lens` interface is uniform and the implementation is pluggable:**

- **Declarative lens** — a panproto spec compiled to `get`/`put` by the engine. Generated or
  hand-authored, law-checked by the engine, and _derivable_ per D1. Task → GTD.
- **Coded lens** — a TypeScript module exporting the same `get`/`put`/complement shape, registered
  under a lens id, for transformations no schema diff can express: parsing, tree construction,
  serialization. Text → rich text.

Both register in the same registry and are exercised by the same law harness; no consumer knows
which kind it holds. Pretending a markdown parser is a schema diff would bend the design out of
shape for no gain. Note the consequence for D1: a coded lens declares its target schema directly
(it cannot be derived from a spec), so derivation covers declarative lenses only.

**Unverified from docs, confirm in Phase 0** (TS SDK surface, per the book): `Panproto.init()`,
`MigrationBuilder.map/.mapEdge/.resolve/.compile` → `CompiledMigration.lift/.get/.put`,
`LensHandle.get/.put/.checkLaws/.toJson`, `Panproto.composeLenses`,
`Panproto.parseJson/.toJson/.convert`, `get()` returning `GetResult { view, complement }`.

## 5. The two lenses

### A. `DataType.Task` → GTD task (declarative, structural)

| Base (`Task`)                               | Lensed (GTD)                             | Op                                                              |
| ------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| `status: 'todo' \| 'in-progress' \| 'done'` | `done: boolean` + `stage`                | lossy split; complement carries the discarded distinction       |
| `priority: 'none'…'urgent'`                 | `priority: 1..5`                         | scalar convert, total both ways                                 |
| `estimate` (minutes)                        | `estimateHours`                          | unit convert — float round-trip fidelity is a real failure mode |
| `title`, `description`                      | unchanged                                | identity                                                        |
| —                                           | `context` (`@home`/`@work`), `waitingOn` | **overlay** → annotation dictionary                             |

The lossy `status` split is the point: `done: false` alone cannot say whether the task is `todo`
or `in-progress`, so `put` needs the complement to restore it. Textbook lens law case, and the
reason to use a real engine rather than a pair of hand-written functions.

### B. `DataType.Text` → rich text (coded, at the **Text object** level)

The lens sits on `Text` (`org.dxos.type.text`, `content: string`), not on `Document`. `Document`
merely holds `content: Ref<Text>`, so lensing `Text` makes it reusable for every text-bearing type
and keeps the document's own properties out of it.

- **Target** — a block tree: `{ blocks: [{ type: 'heading', level, children }, { type:
'paragraph', children: [{ type: 'text', value }] }, …] }`.
- **`get`** — parse `content` with remark → mdast → normalized block tree. `remark`, `remark-gfm`,
  and `mdast-util-to-hast` are already in the workspace catalog, used by `@dxos/react-ui-markdown`.
- **`put`** — the key mechanism: **mdast nodes carry `position.start.offset` /
  `position.end.offset`**, the exact character range of that node in the source. So a block edit
  serializes just that block and applies it as `Text.splice(text, ['content'], start, end - start,
newMarkdown)`. Everything outside the range is untouched, which is what makes concurrent editing
  with a canonical CodeMirror peer merge instead of clobber.
- **Complement** — the source slice per node. Markdown is not canonical (`*` vs `-`, ATX vs setext,
  wrap column, reference vs inline links), so a naive re-serialize rewrites the document and
  destroys every comment anchor in it. Holding the original slice makes untouched blocks
  byte-identical by construction.

**Scope guard:** the lensed UI is a **structured block list** — a typed row per block (heading with
a level control, paragraph with a text input, list with items) — not a WYSIWYG. It proves lensed
interaction without dragging in ProseMirror. A real rich-text editing surface is a separate
question, deliberately unanswered here.

**Scoped out of v1:** stable block identity across re-parses. Offsets shift under a concurrent
peer's edits, so block ids are ephemeral render keys, not persistent identifiers. The durable fix
is Automerge cursors — the anchoring `@dxos/react-ui-editor` already uses for comments.

## 6. Model

### 6.1 The lens entity

```
Lens = { source: TypeDXN, target: JsonSchema (derived cache), spec: LensSpec }
get : Source              -> { view: Target, complement: Complement }
put : Target, Complement  -> Source
```

```ts
Schema.Struct({
  name: Schema.optional(Schema.String),
  source: Schema.String,               // typename@version of the base type
  spec: Schema.Unknown,                // source of truth: declarative spec, or coded-lens id
  target: Schema.optional(internal.JsonSchemaType), // D1 cache; CI asserts == re-derived
  overlayPolicy: Schema.optional(...), // policy, not an enumeration (D4)
})
```

### 6.2 Complement vs overlay

Two different things; keep them separate.

**Complement** — base data that `get` dropped. Needs no storage normally: the base object is still
in the database, so `put` re-reads it. Storage is only required when the view travels away from the
object (to an agent, to a peer, to an export) and is written back later.

**Overlay** — view properties with no counterpart in the base type. These _must_ persist, and they
go in the object's **ECHO annotation dictionary**. `EntityMeta.annotations` is an
`Annotation.Dictionary` on every entity, read/written via `Annotation.get/set/update` and
`Annotation.getDictionary/setDictionary`, with `Annotation.atom`/`atomProperty` giving
per-annotation reactivity — so an overlay field is as live, and as collaborative, as a real one.

```ts
const LensOverlay = Annotation.make({
  id: 'org.dxos.annotation.lens.overlay',
  schema: Schema.Record({ key: Schema.String, value: Schema.Unknown }), // lensDxn -> { prop: value }
});
```

Rules: keyed lens DXN → property, so two lenses never collide and dropping a lens drops its
overlay cleanly; every value validated against that property's schema in the derived target;
overlay properties are **second-class by construction** — not queryable, not indexed, invisible to
consumers without the lens — and a field that needs querying should be **promoted** into the base
type; `overlayPolicy` decides what happens to an unmapped, non-overlay-able property (`reject`
default, or `store`).

### 6.3 Read and write tiers

- **T1 — snapshot codec.** `get(obj)` / `put(view, obj)` in one `Obj.update`. Read-modify-write.
  Fine for agent tools, import/export, and unit tests. **Not safe for concurrent editing.**
- **T2 — live, minimal-write.** Reads derived reactively; writes touch only the properties (or
  character ranges) the edit actually changed. **Required by every story in §7.**

For a declarative structural lens, T2 compiles the spec to a path→path table with pointwise value
codecs, driven by `Obj.getValue`/`Obj.setValue`. Non-pointwise specs fall back to T1 and are barred
from collaborative surfaces. For a coded lens over a string CRDT, T2 is `Text.splice` over the
edited node's source range (§5.B).

### 6.4 Concurrency — why writes must be minimal

The constraint the collaboration stories impose, and it is load-bearing.

Automerge merges concurrent changes **per property** (and per character within a string). A
snapshot `put` assigns _every_ property, including untouched ones — so two peers editing different
fields concurrently clobber each other: peer B's lensed write of an untouched `title` beats peer
A's concurrent edit under last-writer-wins, and A's edit vanishes.

**A lens write assigns only what changed.** Structural: diff the view, map changed paths back
through the table, assign those. Text: never rewrite `content`; splice the changed range.

T1 remains correct for single-writer contexts and is what unit tests use. It must not be what the
UI calls.

### 6.5 Identity and composition

A lens never changes object identity — `id`, refs, and relations are untouched, never lensed.
Lenses compose (`Task → GTD → LLM-tool-shape` as one chain), composed at registration. Queries
stay on the base type; a lens applies post-query.

## 7. Stories — the deliverable

Two per lens, in `packages/stories/stories-lens`, all with `play` functions so CI enforces them.

### 7.1 Lensed UI + proof of persistence (single peer)

Three panes: the **lensed UI** (built only against the derived target schema, importing no
`DataType.Task` / `DataType.Text`); the **canonical UI** (standard `Form`, or the CodeMirror
editor) live on the same object; and the **raw inspector** — the base object's JSON _and_
`Obj.getMeta(obj).annotations`, live.

The inspector is the proof, not decoration: it shows lensed edits landing as ordinary base-schema
properties, and overlay-only fields landing in the annotation dictionary and nowhere else.

### 7.2 Live collaboration across the lens boundary (two peers)

`withMultiClientProvider({ numClients: 2, createSpace: true })` (`@dxos/react-client/testing`)
already creates N clients, performs a genuine invitation into a shared space, and lays panes out
side by side; `ClientStory` exposes `index`, so the story renders **canonical in pane 0, lensed in
pane 1** over the same object.

Demonstrated in both directions:

- A sets `status: 'in-progress'` → B's lensed UI shows `done: false`, `stage: 'in-progress'`,
  no reload. B toggles `done` → A shows `status: 'done'`.
- B sets an overlay field (`context: '@work'`) → persists, survives reload, invisible on A's form,
  present in A's inspector under `meta.annotations`.
- **Concurrent non-conflicting edits merge** (A edits `title` while B toggles `done`) — the
  assertion that fails if §6.4 is violated, and the most valuable test in the plan.
- Text: A types in CodeMirror while B edits a _different_ block; both survive and untouched
  markdown is byte-identical.

## 8. Risks and open questions

1. **WASM in our runtime.** `@panproto/core` is a WASM build; unknown size, worker/`workerd`
   loadability, cold start. Gates the architecture → Phase 0. Fallback: implement the structural
   subset natively in TypeScript (a path table plus value codecs) and use panproto only at author
   time to generate and law-check specs that ship as JSON. **The fallback still delivers both
   lenses, all four stories, and D1** — it costs D3's generation half, which was always the
   weakest link.
2. **Derivation fidelity (D1).** Our JSON Schema carries ECHO-specific annotations (`PropertyMeta`,
   `Format`, refs). A derived target must preserve the ones the UI depends on — a derived
   `SingleSelect` that loses its option set renders as a bare string field.
3. **Reactivity composition.** The lensed atom must compose `Obj.atom` with `Annotation.atom`
   without over-firing.
4. **Write minimality** (§6.4) — the correctness risk, covered by the concurrent-edit test.
5. **Block identity under concurrent edits** (§5.B) — scoped out, needs Automerge cursors.
6. **Validation.** A `put` validates against the base type before writing; a lens is not a bypass.
7. **Versioning.** A lens pins `source` to `typename@version`; policy needed for when the base type
   migrates out from under it — and, with D1, whether the target re-derives automatically.
8. **Overlay sprawl.** Invisible to queries and indexes; without a promotion path it becomes a
   shadow schema.

## 9. Proposed layout

- `packages/sdk/lens` — `@dxos/lens`, `"private": true`. Staging ground for what becomes
  `@dxos/echo`'s `Lens` module (§2.1).
  - `Lens.ts` (interface + ECHO entity), `derive.ts` (D1), `codec.ts` (T1), `live.ts` (T2),
    `overlay.ts`, `registry.ts`, `laws.ts` (D4 harness over `GeneratorAnnotation` instances).
  - `lenses/task-gtd.ts` (declarative).
- Optional engine package — panproto/WASM binding: compile, generate (D3), `checkLaws`.
- Rich-text lens package — the coded lens, owning the remark dependency.
- `packages/stories/stories-lens` — four stories, two custom UIs, shared raw inspector.
- No plugin until the stories prove the UI story is worth shipping.

## 10. References

- panproto — https://github.com/panproto/panproto · book https://panproto.dev/book/ ·
  `panproto-lens` https://docs.rs/panproto-lens/latest/panproto_lens/ ·
  toolkit https://github.com/panproto/panproto-toolkit
- DXOS: `packages/core/echo/echo/src/Type.ts` (`Type.Type`, `makeObjectFromJsonSchema` — the
  static/stored precedent), `packages/core/echo/echo/src/{Annotation,Text,JsonSchema,Obj}.ts`,
  `packages/core/echo/echo/src/internal/common/types/meta.ts` (`EntityMetaSchema.annotations`),
  `packages/sdk/schema/src/testing/generator.ts` (`createProps`, `GeneratorAnnotation`),
  `packages/sdk/react-client/src/testing/withClientProvider.tsx` (`withMultiClientProvider`),
  `packages/sdk/types/src/types/Task.ts`, `packages/sdk/schema/src/types/Text.ts`.
