# ECHO Lenses — Design

Interact with an ECHO object through a **lens** — a declared, bidirectional view of its
shape — instead of through its base type. Fields the lens exposes that have no counterpart
in the base type persist in the object's ECHO annotation dictionary.

Status: **design only**, nothing implemented. No PR.

Two goals, both load-bearing:

1. **First-class.** A lens is an ECHO concept alongside `Type` — definable statically in code or
   persisted in a space, resolved through a registry, with the same static/dynamic duality types
   already have.
2. **A lens always binds two declared types.** Both ends are written out; the mapping between them
   is the only thing anyone authors, and it is as short as we can make it — matching properties map
   themselves, target properties with no counterpart store themselves. §3 grades what that leaves
   computable.

**Near-term scope: a proof of concept.** The payoff being chased first is _multiple interfaces,
each written against its own schema, driving the same object_. Foreign-type adaptation and
migration support are long-term payoffs this shape enables and are explicitly not built first.

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

**Now:** one object, several interfaces, each written against its own schema. An interface is built
once against a target type and works for every source that maps to it — because a lensed object
carries the target's typename, so surfaces, forms, and cards resolve the interface already written
for that type.

**Later, enabled by the same shape:** adapting foreign types (`Linear.Issue` rendered by the `Task`
UI) and running against a migration's destination shape before the data moves. Neither is built
first; both fall out of binding two declared types.

One requirement follows from all of them: a target property with no counterpart in the source
**must not be an error**. It stores itself in the object's annotations automatically, no
declaration required (API.md §2).

## 2. First-class in ECHO

ECHO already has exactly the duality a lens needs, and we should mirror it rather than invent a
parallel mechanism: a type is either **static** (`Type.makeObject(...)`, compile-time TypeScript
types) or **stored** (`Type.Type`, the meta-schema entity holding `{ typename, version,
jsonSchema }`, persisted with `db.addType()`, queried via `Filter.type(Type.Type)`, materialized
at runtime with `Type.makeObjectFromJsonSchema`). Static gets you autocomplete; stored gets you
user-authored schemas at the cost of dynamic typing. That tradeoff is already understood by
everyone who uses ECHO, and lenses inherit it unchanged.

**Concrete signatures: [API.md](../../../packages/core/echo/echo-panproto/API.md)** — the mapping shorthands, coded lenses, the live
handle, React hooks, registry, and laws, with the open questions called out.

Proposed surface, shaped as a namespace module like `Type` / `Obj` / `View`:

```ts
Lens.make(id, Source, Target, mapping); // the single authoring shape; both ends declared
Lens.Lens; // ECHO entity for persisted lenses (cf. Type.Type)
Lens.coverage(lens); // explicit / automatic / overlaid / dropped / suspicious
Lens.checkLaws(lens); // property-based verification            (§3, D4)
Obj.lens(obj, lens); // live lensed handle: reactive reads, minimal writes
```

Registry: stored lenses resolve out of the space by source typename, exactly as stored types do.

### 2.1 Where the code lives — extend `@dxos/echo-panproto`

PR #12395 (merged) created **`@dxos/echo-panproto`** (`packages/core/echo/echo-panproto`), and the
object-lens work lands there rather than in a new package. What the package already establishes —
each of these was a Phase 0 unknown, now settled by shipped code:

- **The engine works, and its isolation pattern is decided.** `@panproto/core@0.56.1` is wrapped
  behind the `@dxos/echo-panproto/wasm` entrypoint and loaded lazily by the runner, so the durable
  API never statically depends on the wasm. The SDK surface is verified against the real package
  (`Panproto.init()` → `parseLexicon` → `migration().map().mapEdge().compile()` → `liftJson`), and
  it runs in node (CI tests) and the browser (plugin-atproto ships it in Composer). The workerd
  question is defused rather than answered: the wasm never enters the static graph, so nothing
  breaks where it can't load.
- **Lens-as-data precedent.** `Panproto.Lens` is a serializable Effect Schema value — an `adapters`
  array (scalar / array / ref / meta / prefix / dateOnly / timestamp / struct / derive) plus an
  optional structural `migration` — carried on a _type_ via `AtprotoRecordAnnotation` in
  `@dxos/schema`. Exactly the shape our persisted lens needs.
- **A working runner** executing declarative mappings against live ECHO objects via
  `Obj.getValue`, with host-side codecs registered by name (`registerTextFormat`,
  `registerRefType`) — the same named-codec pattern our coded value conversions need.

**Relationship between the two lens kinds, stated precisely.** The existing `Panproto.Lens` is a
**wire lens**: ECHO object ↔ foreign JSON record, snapshot encode/decode, one direction at a time,
built for publishing (atproto). The object lens this project adds is ECHO object ↔ **declared ECHO
target type**: a live handle with reactive reads, minimal writes, overlay persistence, and typename
identity. In API.md §1 terms, the wire lens is the degenerate case where the target is a plain
`Schema.Schema.Any` and only the snapshot tier exists — so the two share a package honestly, and
converging the wire lens onto the object-lens interface later is a refactor, not a rewrite. Until
then they are sibling modules: the existing `Panproto` namespace stays as-is; the object lens ships
as a new `Lens` namespace export from the same package.

Package split:

- **`@dxos/echo-panproto`** — existing `Panproto` (wire lens + runner) plus new `Lens` (object
  lens: entity, mapping resolution, coverage, overlay, read/write tiers, registry). Depends on
  `@dxos/echo` (including `@dxos/echo/internal`, a public subpath already used by ~20 packages).
- **`@dxos/echo-panproto/wasm`** — the engine, unchanged; the object lens uses it the same way the
  runner does (lazily, optionally).
- **React hooks** — `useLens`, on the package's own `./react` subpath for now (so the whole lens
  surface stays in one package), destined for a react sibling once the API is internalized.
- **Coded lenses ship with their dependencies** — the rich-text lens owns remark.

**Promotion into `@dxos/echo`** stays the long-term intent once the model is proven: move the
`Lens` module beside `Type`/`View`/`Annotation`, add `Obj.lens` as the entry point — an import-path
change at call sites, no compatibility re-exports. The engine, the wire runner, the hooks, and the
coded lenses stay outside core regardless; none of those dependencies belongs in a package that
loads in the shared worker.

**The one thing that could force core work early:** if the live proxy needs a change inside `Obj`'s
proxy handler rather than composing over public internals. That surfaces in Phase 1, and if it does
it becomes its own small core PR rather than derailing the prototype.

## 3. What is computed for you

Graded honestly, against the decision that a lens always binds two **declared** types (§ above).
That decision retires the hardest problem rather than solving it.

### D1. Deriving the target type. **Retired — we don't want it.**

An earlier draft computed the target schema from the mapping. Dropped: always having a hard type on
both ends is worth more than not typing one out, because it is what lets an interface be written
once against a stable target and reused across sources.

The machinery still earns its keep, pointed the other way. Derive the shape the mapping _implies_,
diff it against the **declared** target, and the difference is the coverage report: which target
properties are explicitly mapped, which auto-mapped, which fall through to overlay, and which look
like a mistake (API.md §2.1). Same computation, run as a check instead of a generator.

### D2. Static TypeScript types. **Solved, and for free.**

This was the design's hardest open problem — inferring a target type through a chain of combinators
— and binding a declared target dissolves it. `Lens.Target<typeof L>` is just
`Type.InstanceType<typeof TargetType>`.

The consequence worth noticing: it holds for **persisted** lenses too. A lens loaded from a space
that targets a statically declared type still yields that static type at compile time — strictly
better than the stored-_schema_ analogue, where dynamic typing is unavoidable. No combinator
generics to maintain, and no op set whose design gets bent by what is convenient to express in
TypeScript.

### D3. base type + target type → **derive the mapping**. Not as inference. Yes as propose-and-verify. **Long-term.**

_Whether to take it on, with a worked example and a recommendation: TASKS.md → "`Lens.generate` — decision note". This section is the why; that one is the call._

Not in the proof of concept — the mappings we need are short enough to write. Recorded because bind
mode is exactly this feature's input, so nothing here precludes it, and because the _reason_ it
can't be fully automatic is worth stating once: the failure is structural rather than a matter of a
better algorithm.

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

So generation would emit a **draft with explicit holes** rather than guessing — a scaffolding tool,
not an oracle. Note the holes it reports are _not_ the same as properties that fall through to
overlay: a target property with no counterpart at all is fine and silent, while one with a
plausible counterpart whose value mapping can't be inferred must stay unresolved (API.md §2.1).

- The holes are exactly where an LLM is useful, and panproto already ships an MCP server and
  Claude Code skills aimed at it. Property names, `title`s, and descriptions are the hints.
- The holes are also a finding about _our_ schemas: `estimate` records no unit, so no tool —
  human, statistical, or otherwise — can infer the factor 60. Richer annotations make more of a
  mapping inferable. That is actionable independent of this project.

**And the verification half is what makes a proposed lens trustworthy**, which is where this stops
being hand-waving: propose cheaply, then verify mechanically with `checkLaws` over instances
generated from the source type's own `GeneratorAnnotation`s (`createProps` /
`createObjectFactory` in `@dxos/schema/testing`) — `DataType.Task` already annotates every
property with a generator. Property-based lens verification, zero fixtures written. We cannot
derive the semantics, but we can make a wrong guess fail loudly and immediately, which is most of
the value.

### D4. Also derived, and cheaply

- **The identity mappings** — a target property with a same-named, type-compatible source property
  maps itself; nothing to write. This is where mapping brevity mostly comes from.
- **The overlay property set** — target properties nothing maps. No hand-maintained list.
- **The T2 write path** — the path→path table compiled from the mapping (§6.3).
- **Law-check instances** — from `GeneratorAnnotation`, per D3.
- **The UI** — forms and tables are already schema-driven, so they render the target type with no
  lens-specific code. The custom UIs in §7 are custom because we _want_ to demonstrate a bespoke
  interface, not because a generic one is impossible.

## 4. Why panproto, and why it isn't the only implementation

[panproto](https://github.com/panproto/panproto)'s layer 4 (`panproto-lens`) is an asymmetric lens:
`get` (source → view, dropping data into a **complement**) and `put` (view + complement → source),
with `check_laws` mechanically verifying GetPut and PutGet. It ingests ~47 schema languages
(JSON Schema, OpenAPI, Protobuf, GraphQL, Avro, ATProto Lexicon, SQL DDL), composes lenses, and
provides the `lens generate` half of D3. Bindings: Rust, `@panproto/core` (WASM/TypeScript),
Python, a CLI, and an MCP server + Claude Code skills.

**The engine is already in the repo and verified** — `@dxos/echo-panproto/wasm` wraps
`@panproto/core@0.56.1` and exercises `Panproto.init()` → `parseLexicon` →
`migration().map().mapEdge().compile()` → `liftJson` in CI (§2.1). One scope note from that
integration, learned the honest way: the shipped TS API exposes **structural** graph transforms
(vertex/edge alignment, renames, nesting) but no value-expression step — which is exactly why
`echo-panproto` splits every lens into a structural `migration` (engine) plus host-side `adapters`
(runner). Our object lens inherits that split: the engine handles structure, and value conversions
are named host-side codecs.

**And the `Lens` interface is uniform, the implementation pluggable:**

- **Declarative lens** — a serializable mapping (structural pass + named value codecs), executed by
  the engine + runner. Task → GtdTask.
- **Coded lens** — a TypeScript module exporting the same `get`/`put`/complement shape, registered
  under a lens id, for transformations no per-property mapping can express: parsing, tree
  construction, serialization. Text → rich text.

Both register in the same registry and are exercised by the same law harness; no consumer knows
which kind it holds. Pretending a markdown parser is a schema diff would bend the design out of
shape for no gain.

Still to verify (the law-check surface is not yet exercised by `echo-panproto`):
`LensHandle.checkLaws` / `checkGetPut` / `checkPutGet`, and whether `get()` returns a usable
`GetResult { view, complement }` for round-tripping. That is the remaining Phase 0 engine spike.

## 5. The two lenses

### A. `DataType.Task` → GTD task (declarative, structural)

`GtdTask` is a **written-out ECHO type**, not a derived one, so the lensed UI is an ordinary
interface built against an ordinary type and the mapping is the only new artifact. `title` and
`description` match by name and type and so are absent from the mapping entirely.

| Base (`Task`)                               | Target (`GtdTask`)                       | Mapping                                                         |
| ------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| `status: 'todo' \| 'in-progress' \| 'done'` | `done: boolean` + `stage`                | lossy split; complement carries the discarded distinction       |
| `priority: 'none'…'urgent'`                 | `priority: 1..5`                         | scalar convert, total both ways                                 |
| `estimate` (minutes)                        | `estimateHours`                          | unit convert — float round-trip fidelity is a real failure mode |
| `title`, `description`                      | same                                     | **automatic** — omitted from the mapping                        |
| —                                           | `context` (`@home`/`@work`), `waitingOn` | **overlay** → annotation dictionary, no declaration             |

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
Lens = { source: TypeDXN, target: TypeDXN, mapping: Mapping }
get : Source              -> { view: Target, complement: Complement }
put : Target, Complement  -> Source
```

```ts
Schema.Struct({
  name: Schema.optional(Schema.String),
  source: Schema.String, // typename@version of the base type
  target: Schema.String, // typename@version of the declared target type
  mapping: Schema.Unknown, // partial: explicit entries only (API.md §2)
});
```

Both ends are typename references to declared types — the target is not a stored schema blob, so
there is no cache to keep in sync and no re-derivation to verify.

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

Rules:

- **Unmapped target properties overlay automatically** — no declaration, no error. A lens must never
  fail to load because the target has a field the source lacks; that is the normal state of affairs
  (§1). `store` is the default; `reject` exists only for lenses that want to be strict.
- Keyed lens DXN → property, so two lenses never collide and dropping a lens drops its overlay
  cleanly. Every value is validated against that property's declaration in the target type — which
  always exists, since the target is always written out.
- Overlay properties are **second-class by construction** — not queryable, not indexed, invisible to
  consumers without the lens. A field that needs querying belongs in the base type. (Draining
  overlays into real properties once a base type gains them — `Lens.promote` — is a long-term
  migration concern, not part of the proof of concept.)
- **Silent is not the same as invisible.** `Lens.coverage(lens)` reports explicit / automatic /
  overlaid / dropped, and flags `suspicious` — a name match with incompatible types, or an overlay
  whose name resembles a source property. That case must never auto-resolve in either direction:
  storing `done` in annotations while `status` also exists records the same fact twice and the two
  drift on the next write. A genuinely new field overlays forever and correctly; a missed
  correspondence gets flagged (API.md §2.1).

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

Three panes: the **lensed UI** (built only against the target type, importing no
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

1. **WASM in our runtime — largely resolved by `echo-panproto`.** The engine runs in node and the
   browser today, and its lazy `/wasm` entrypoint keeps it out of every static graph, so nothing
   breaks where it can't load. Residual: the law-check surface is unexercised (§4), and running the
   engine _inside_ the shared worker (rather than only host-side) is unproven — but the object lens
   never requires that: mapping resolution is plain TypeScript, and the engine is only consulted at
   author/verify time.
2. **Type compatibility for automatic mapping.** How strict is "same name, compatible type"?
   Optionality mismatches (`string` vs `string | undefined`) are the common case and should
   auto-map in the safe direction only; enum literals that differ must not auto-map at all
   (API.md §10.1).
3. **Reactivity composition.** The lensed atom must compose `Obj.atom` with `Annotation.atom`
   without over-firing.
4. **Write minimality** (§6.4) — the correctness risk, covered by the concurrent-edit test.
5. **Block identity under concurrent edits** (§5.B) — scoped out, needs Automerge cursors.
6. **Validation.** A `put` validates against the base type before writing; a lens is not a bypass.
7. **Versioning.** A lens pins `source` to `typename@version`; policy needed for when the base type
   migrates out from under it — and, with D1, whether the target re-derives automatically.
8. **Overlay sprawl.** Invisible to queries and indexes; without a promotion path it becomes a
   shadow schema.
9. **Losslessness under late writes** (§10.1) — the bar migration sets itself, and the one claim in
   this document that is not yet proven anywhere. §10.3 states it falsifiably so a spike can kill it
   early.

## 9. Proposed layout

- `packages/core/echo/echo-panproto` — existing package (PR #12395); the object lens lands beside
  the wire lens as a new `Lens` namespace export, staging ground for what eventually becomes
  `@dxos/echo`'s `Lens` module (§2.1).
  - Existing: `Panproto.ts`/`lens.ts` (wire lens schema), `runner.ts` (encode/decode + named
    codecs), `wasm.ts` (engine).
  - New: `Lens.ts` (interface + ECHO entity), `mapping.ts` (resolution + shorthands),
    `coverage.ts`, `codec.ts` (T1), `live.ts` (T2 proxy), `overlay.ts`, `registry.ts`, `laws.ts`,
    `lenses/task-gtd.ts`.
- React hooks — `useLens` on the `./react` subpath of the same package (see §2.1).
- Rich-text lens package — the coded lens, owning the remark dependency.
- `packages/stories/stories-lens` — four stories, two custom UIs, shared raw inspector.
- No plugin until the stories prove the UI story is worth shipping.

## 10. Migration

Not scheduled. Recorded because the lens changes what is _possible_ here: it turns a migration from a
one-shot script into a rule that can be re-applied, and that is what makes the goal in §10.1
plausible rather than hopeless.

### 10.1 The bar: lossless except for genuine conflicts

**No unconflicted change may be lost, regardless of when it was made.**

The case that defines the requirement: a migration runs while a peer is offline. That peer's app
still has the old schema, so it keeps editing the object under the old shape — for a day, a week. It
comes back. Those edits conflict with nothing; they were simply made late and in the wrong shape.
They must end up in the new schema.

What may be lost: only a change that _genuinely_ conflicts — two peers writing incompatible values
for the same field, where some resolution has to pick one. That is a CRDT's ordinary business.

What must not be lost, and is lost today:

- A late edit under the old schema, because the migration already rewrote that property (§10.2).
- Any concurrent edit to an object being migrated, because `atomicReplaceObject` writes the whole
  object.
- Anything a peer wrote that is not in the new root when a space migration publishes an epoch.

This may not be fully achievable, and §10.3 states the falsifiable version so we can find out early
rather than discover it in the third phase. But it is the goal we set, and it should be the thing
each phase is measured against.

### 10.2 What exists today

Two independent layers, neither aware of the other.

**Object-level** — `Migration.define({ from, to, transform })` in `@dxos/echo/Migration.ts`, run by
`db.runMigrations()` (`echo-client/src/proxy-db/database.ts`). Per type: query every object of
`fromType`, `await transform(object)`, then `atomicReplaceObject(object.id, { data, type, meta })`.
Three properties worth naming:

- **It migrates in place.** Same object id, no new object. That is the right default and it is
  already what we do.
- **`transform` is an opaque async function.** Nothing can be said about it before it runs — not
  what it drops, not whether it is reversible, not whether it is deterministic, and it cannot be
  re-applied to a late write because it consumes a whole object and returns a whole object.
- **It writes the whole object.** A concurrent edit by another peer to a property the migration
  never meant to touch is lost.

`onMigration` is the escape hatch for effects, and its own docstring records the problem: _"Database
mutations performed in this callback are not guaranteed to be idempotent. If multiple peers run the
migration separately, the effects may be applied multiple times."_

**Space-level** — `Migrations` + `MigrationBuilder` in `@dxos/migrations`. A versioned list; the
current version is a single `MigrationVersionAnnotation` on `space.properties`; `_commit()` builds a
whole new root document and publishes it via `createEpoch({ migration: REPLACE_AUTOMERGE_ROOT })`.
One peer rebuilds the world and everyone else adopts it, so anything another peer wrote that is not
in the new root is gone. The version marker is a single scalar — two peers advancing it race, and it
says nothing about _which_ objects actually migrated.

Also present and directly relevant: `EntityMeta` carries `key` + `version` **per object** and a
migration's `transform` may patch it atomically with the data swap; `Database` has real branching
(`createBranch` / `switchBranch` / `mergeBranch` / `syncBranch`, same object ids, CRDT merge-back);
and `A.getHeads` / `A.diff(doc, before, after)` are already used in `echo-client`
(`echo-handler/edit-history.ts`), which is the machinery §10.3 needs.

### 10.3 Fold-forward — the research question

The hypothesis that makes §10.1 reachable:

> A migration expressed as a lens is a **total, idempotent rule**, not an event. So it can be
> re-applied whenever old-shaped data appears — including data that appears long after the migration
> "ran" — and the late write lands in the new schema instead of being lost.

**Why the data is still there to recover.** Automerge merges per property. A late write to
`firstName` by an offline peer is a change to that key; it does not vanish because another peer
wrote `name`. After merge the object carries new-shape properties _and_ an orphan old-shape property.
The information is present; the problem is purely one of noticing it and folding it forward.

**How to notice it.** Record the automerge heads at which the migration was applied, on the object
(`EntityMeta`). On merge, `A.diff(doc, migrationHeads, currentHeads)` restricted to source-schema
properties yields exactly the writes made to the old shape at-or-after the migration. Anything in
that set is a late write. Feed it through `Lens.get` and apply the result as minimal writes. The
heads comparison is what distinguishes a late write from pre-migration residue the migration already
consumed — without it you cannot tell them apart, and you would re-apply stale data forever.

**Why only a lens can do this.** A `transform` takes a whole old object and returns a whole new one;
given one late property it has nothing to work with, and re-running it would clobber everything that
happened since. A lens maps _per property_ and emits minimal writes, so folding one late property
forward touches exactly that property's target. Idempotence is what makes it safe to run on every
merge; `checkLaws` is what makes idempotence checkable.

**Two cases, only one of which is hard.** A _lens-aware_ old client is easy — it writes through
`Lens.put` and the data is in the right shape already; this is the same bidirectionality that lets
old clients keep working (§10.6 B). The hard case is a _schema-unaware_ client: shipped code that
knows only the old type and writes it directly. Fold-forward is for that case.

**Falsifiable claims for the proof of concept**, in the order they would kill the idea:

1. **Does the late write survive at all?** If the migration deletes old properties, does a
   concurrent/later write to a deleted key survive the merge, or does the delete win? If deletes win,
   migrations must not delete — old properties stay until a separate, later compaction, and that is a
   design constraint, not a detail.
2. **Can late writes be distinguished from consumed ones?** Does `A.diff` from stored migration heads
   give a clean answer per property, through our document structure and across a doc that has since
   been compacted or re-rooted by an epoch? Epoch/compaction rewriting history is the likeliest way
   this breaks.
3. **Does folding forward converge?** Two peers both notice the same late write and both fold it.
   With deterministic minimal writes they should produce identical changes and merge to one state —
   but this needs proving, not assuming.
4. **What happens on a chain?** Object migrated A→B→C; a late write arrives in shape A. Does
   composing lenses fold it all the way forward, and is the composition still idempotent?
5. **Where does a genuine conflict surface?** A folded-forward value and a directly-written value
   both target `name`. The result must be an ordinary CRDT conflict a user can see and resolve — not
   a silent overwrite in either direction.

### 10.4 A migration is a lens

`Migration.fromLens(L)` — the migration's `transform` is `Lens.get`. Small change, and every
consequence is something a `transform` function cannot offer:

1. **Loss becomes visible before the migration runs.** `Lens.coverage` grades every property
   `explicit` / `automatic` / `overlaid` / `dropped` / `suspicious`. A `transform` that forgets a
   property drops it silently; a lens reports it as `dropped` at define time. A migration that loses
   data should be a diff you review, not an omission.
2. **It is reversible.** `put` as well as `get`, so the migration runs backwards — rollback, and old
   clients that read through the reverse lens.
3. **It is checkable.** `checkLaws` over generated instances, before touching real data.
4. **It writes only what changed.** The `Write` vocabulary cannot express a whole-object replace —
   the opposite of `atomicReplaceObject`, and the prerequisite for both concurrent migration and
   fold-forward.

`Migration.define` with a hand-written `transform` stays for what a mapping cannot express. The lens
form is what you reach for first, and only the lens form gets fold-forward.

### 10.5 Cross-object, built for atomicity we do not have yet

ECHO transacts within one object, not across objects; Automerge has cross-object dependencies on its
roadmap. The rule that lets us write the API now and get atomicity later for free:

> **Make the effects data, not callbacks.**

A cross-object migration declares a match — a tuple of objects — and _returns_ a write set addressed
to them rather than performing it. `Write` extends with an object address; nothing else changes.

- **Today** the runner applies the set per object, non-atomically, but because the writes are data it
  can order them deterministically, make them idempotent, and resume after a crash.
- **Later** it hands the same set to a cross-object transaction. No call site moves.

The hard part is **identity**: splitting one object into two means minting an id, and two peers
minting independently produce two objects. Require **derived ids** — a new object's id is a hash of
the source id plus a role name, so two peers independently minting "the `Person` for `Task` X"
derive the same id and Automerge merges them into one. Reject non-derived ids outright.

### 10.6 Convergence between peers

A preference order, not a menu.

**A. Deterministic, idempotent, in place — no coordination.** If a migration is (i) a pure function
of the object's own state, (ii) applied as minimal property writes, and (iii) mints new ids
deterministically, two peers running it concurrently emit the _same_ writes and Automerge merges them
to the same state. No leader, no epoch, works offline. §10.4 and §10.5 are what make this reachable,
so the API should make determinism the default and force an explicit opt-out.

**B. Do not migrate — read through the lens.** Jazz's answer: schemas are hashed, lenses are
bidirectional, data stays in the branch of the schema that wrote it, and lenses translate on read and
write. We are well placed for it — our lens is already bidirectional and the **overlay already stores
target-only fields on the base object**, so an object can live indefinitely as "old shape + overlay"
driven entirely through the new type. Migration becomes optional compaction. The cost is the risk
already recorded in §8.8: the overlay is invisible to queries and indexes, so a new field cannot be
filtered on until promoted. That is the real trade — availability without coordination, paid for in
queryability — and `Lens.promote` is what settles it, per object, whenever convenient. Jazz reaches
this with a server and a schema registry; we would reach it with the overlay or with derived
branches, which is a difference worth keeping in view rather than porting their design whole.

**C. Coordination — leader election or a swarm lease.** Only for what A and B cannot cover:
non-deterministic transforms, external effects, anything that must happen exactly once. A migration
marks itself `effectful`, requires being online, and claims a lease. It cannot run offline and a
partition either blocks it or risks two leaders, so it must be the exception a migration asks for.

**D. Epochs become compaction only, never the migration mechanism.** An epoch is a storage
optimization, run when convenient; correctness never depends on one. This retires the current failure
mode directly. Note the interaction with §10.3 claim 2 — compaction rewrites history, so it must not
destroy the heads fold-forward relies on.

**And version state moves onto the object.** A space-level scalar cannot say which objects migrated
and races between peers. `EntityMeta.version` already exists per object and `transform` can already
patch it atomically with the data, so per-object stamping makes migration incremental, resumable and
convergent — and makes "what is left to migrate" a query instead of a guess.

### 10.7 Open questions

1. **Does promotion need coordination?** Draining an overlay into a real property is idempotent and
   deterministic, so probably not — but it changes what queries return, so peers disagree until it
   propagates. Is a half-promoted space acceptable, and for how long?
2. **How long is the fold-forward window?** Keeping migration heads and un-deleted old properties
   forever is a storage cost. When is it safe to compact, given a peer could always have been offline
   longer?
3. **Reverse compatibility window.** How long do we keep old lenses, and what happens when a chain
   grows to several hops?
4. **Lens versioning** (§8.7) — a lens pins `source` to `typename@version`, and migration is exactly
   the event that moves it. These must be designed together.
5. **Validation on the way through.** A `put` validates against the base type; during a migration the
   base type is what is changing.
6. **Does branching subsume the overlay here?** `createBranch`/`mergeBranch` already gives same-id
   alternate timelines with CRDT merge-back — close to Jazz's per-schema-hash branches. Possibly a
   better home for in-flight migration state than the overlay.

## 11. Cross-object lenses

Not built. Two different asks get conflated here, and they have opposite difficulty profiles, so name
them separately:

- **Composition** — the referenced object is _itself_ lensed. `Task.assignee: Ref<Person>` becomes
  `GtdTask.assignee: Ref<GtdPerson>`, and dereferencing yields a lensed `Person`. A lens over a
  _graph_, one lens per node.
- **Projection** — fields of the referenced object are flattened into the target.
  `TaskRow.assigneeName: string`. A lens over one node that reaches sideways.

Composition is the more useful of the two **and the easier one**, which is not the intuitive ordering.
It gets §11.2–11.4; projection is §11.5.

### 11.1 Shape today: a ref crosses, it does not open

A mapping's `from` is a list of property names on one object, and `readSource` reads them off that
object (`lens/mapping.ts`). There is no traversal, and a `Ref` is an opaque value: `compatible()`
compares declarations by AST identifier, so `Ref(Person)` auto-maps to `Ref(Person)` and to nothing
else. A lensed `Task` hands you `assignee` unchanged — the same ref, to the same `Person`.

In particular `Ref(Person)` against `Ref(GtdPerson)` is _incompatible_ today and reports as
`suspicious`. That is the correct default (a wrong automatic mapping is worse than an absent one) and
it is exactly the hole composition fills.

### 11.2 Composition — the shape

```ts
class GtdPerson extends Type.makeObject<GtdPerson>(...)({ /* ... */ }) {}
const PersonLens = Lens.register(Lens.make('…person-as-gtd', Person, GtdPerson, { /* ... */ }));

class GtdTask extends Type.makeObject<GtdTask>(...)(Schema.Struct({
  assignee: Schema.optional(Ref.Ref(GtdPerson)),
})) {}

const GtdLens = Lens.make('…task-as-gtd', Task.Task, GtdTask, {
  assignee: Lens.via('assignee', PersonLens),
});
```

`gtdTask.assignee.target` yields `Lens.of(person, PersonLens)` — a lensed handle that already reports
`GtdPerson` as its typename. Still one object per node in the database; still no copies.

Resolution can be automatic rather than declared: the target schema says the ref points at
`GtdPerson`, and `Lens.sourcesFor(GtdPerson)` already answers "which registered lenses produce a
`GtdPerson`". Picking the one whose source matches the referenced object's actual typename is a
lookup we can already perform, so `Lens.via` is the explicit form and registry resolution is the
convenience. `compatible()` should then grade `Ref(Person)` → `Ref(GtdPerson)` as `automatic` when a
registered lens connects them, and keep reporting `suspicious` when none does.

### 11.3 Why composition is the easier one

Every wall that makes projection awkward (§11.5) is absent here.

1. **It introduces no partiality of its own.** `ref.target` is already `T | undefined`; composition
   lenses whatever comes back and returns `undefined` otherwise. The partiality belongs to `Ref`,
   where consumers already handle it. Projection has to _invent_ an `undefined` for a property the
   target schema declares as required.
2. **Writes stay inside one object.** Editing `assignee.target.name` is a write to the `Person`
   object alone, through that object's own lens — atomic within that object, exactly as today. No
   cross-object transaction is needed for the common case. Projection's `assigneeName = 'x'` is a
   write to a _different_ object initiated from this one, which is the case that has no atomicity.
3. **Reactivity is already per-object.** Each lensed handle subscribes to its own object with the
   existing hook; nothing needs a subscription spanning two objects.
4. **Identity survives.** `Lens.of` returns `new Proxy(obj, …)` over the base object and only
   intercepts the type symbols, so `Obj.getURI`, the DXN, and therefore `Ref.make(lensedHandle)` all
   resolve to the real `Person`. Storing a lensed handle back into a ref should need no unwrapping —
   worth confirming, because it is the difference between "transparent" and "leaky".
5. **The machinery exists.** The live proxy, the typename interception that makes a lensed object
   render in surfaces written for the target type, and `sourcesFor` for resolution are all built.

**The payoff worth naming.** Projection gets you one form over a foreign type. Composition gets you
the whole surface stack — navtree, table, cards, forms — over a foreign _graph_, because every node
in the subtree reports the type those surfaces already dispatch on. That is use case (a) from §1 at
its full size, and it is not reachable by flattening.

### 11.4 The hard parts

1. **Wrapper identity.** `Lens.of` mints a fresh `Proxy` per call, so wrapping on every `.target`
   access breaks `===` and defeats React memoization. Composition needs an `of` cache keyed by
   (base object, lens id) — the same shape as `refSimpleFamily` in `internal/Ref/atoms.ts`. This is
   the first thing to build, not an optimization.
2. **Validation.** The target schema declares `Ref(GtdPerson)` while the stored ref points at a
   `Person`. Anything that validates by resolving a ref and checking its type must see the lensed
   view. `Lens.of` already makes the object _report_ the target typename, so a check via
   `Obj.getTypename` passes — but a check against the stored ref's own type annotation would not.
   Verify against `Form`'s `RefField` and against the validation `put` performs.
3. **Which lens, and what if none.** The target schema's declared ref type disambiguates when several
   lenses share a source. When _none_ is registered, fail at lens construction — never silently hand
   back the raw object, which would be a `GtdPerson`-typed slot holding a `Person`.
4. **Cycles** are fine — wrapping is lazy (only on `.target`) and memoization terminates it.
5. **`Ref.Array`.** Reading maps element-wise and is unremarkable. Appending means storing a lensed
   handle, which point 4 above suggests is transparent; confirm rather than assume.

### 11.5 Projection — flattening fields across a ref

The lesser case, and the harder one. `TaskRow.assigneeName: Lens.through(['assignee', 'name'])`.

Three constraints, in ascending order of hardness:

1. **`get` must stay synchronous and pure** — that is what lets `checkLaws` run without mutating and
   `useLensValue` project on every render (§6). `ref.target` returns `T | undefined` _and triggers a
   load as a side effect_; `ref.load()` is a Promise. So a projected property must be **partial**:
   typed `T | undefined` even when the source property is required.
2. **Reactivity has to follow the hop** or the projection goes stale — the exact failure already hit
   once with the text lens. `refSimpleFamily` already does the work.
3. **Writing through is a write to another automerge document, so it is not atomic.** Same wall as
   cross-object migration (§10.5), same answer: `Write` grows an object address; the runner applies
   per object today and hands the same set to a cross-object transaction later.

Not every hop is equally uncertain, though. `internal/Ref/strong-deps.ts` defines an entity's
**strong-dependency set** — its schema, a relation's source and target, and its parent — and an
entity is not surfaced until those are loaded; arbitrary refs are deliberately excluded. So
projection along a strong dep (a relation reading through to its source or target, a child to its
parent) is **total and synchronous today**, with no new loading machinery. _(Read from the code, not
yet exercised.)_ That is the scoping principle: strong-dep projection first, arbitrary refs second
and explicitly partial.

|                                       | Read                                | Write                                       |
| ------------------------------------- | ----------------------------------- | ------------------------------------------- |
| **Composition** (§11.2)               | Partial only where `Ref` already is | Per object, atomic within each              |
| **Projection · strong deps**          | Total, sync                         | Non-atomic across the hop                   |
| **Projection · single arbitrary ref** | Partial, reactive via the ref atom  | Non-atomic; convergent, writes stay minimal |
| **Projection · multi-hop**            | Partial, latency compounds          | Not worth supporting initially              |
| **Projection · `Ref.Array`**          | Fine — map over loaded targets      | Ill-defined; keep read-only                 |

**What not to expect** from either: atomicity across a hop before Automerge has cross-object
transactions, and queryability or indexing of a projected property — worse than the overlay, since
the value does not live on the object at all.

### 11.6 The connection to migration

A composed lens over a graph is also a **graph migration**: `Task → TaskV2` together with
`Person → PersonV2` migrates a subtree consistently, one node at a time, with each node's writes
minimal and local. That is the same machinery as §10, and fold-forward (§10.3) applies per node — so
a late old-shape write to a referenced object is recoverable exactly as it is for the root.

Projection is the half that needs §10.5's write-set-with-an-address. Composition needs none of it,
which is another reason to build composition first.

## 12. References

- panproto — https://github.com/panproto/panproto · book https://panproto.dev/book/ ·
  `panproto-lens` https://docs.rs/panproto-lens/latest/panproto_lens/ ·
  toolkit https://github.com/panproto/panproto-toolkit
- DXOS: `packages/core/echo/echo/src/Type.ts` (`Type.Type`, `makeObjectFromJsonSchema` — the
  static/stored precedent), `packages/core/echo/echo/src/{Annotation,Text,JsonSchema,Obj}.ts`,
  `packages/core/echo/echo/src/internal/common/types/meta.ts` (`EntityMetaSchema.annotations`),
  `packages/sdk/schema/src/testing/generator.ts` (`createProps`, `GeneratorAnnotation`),
  `packages/sdk/react-client/src/testing/withClientProvider.tsx` (`withMultiClientProvider`),
  `packages/sdk/types/src/types/Task.ts`, `packages/sdk/schema/src/types/Text.ts`.
