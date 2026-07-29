# ECHO Lenses — Design

Interact with an ECHO object through a **lens** — a declared, bidirectional view of its
shape — instead of through its base type. Fields the lens exposes that have no counterpart
in the base type persist in the object's ECHO annotation dictionary.

Status: **design only**, nothing implemented. No PR.

## 1. Motivation

An ECHO object has exactly one type today (`Type.makeObject` + a typename@version DXN), and
every consumer — form, table, agent tool, connector — sees that one shape. In practice we keep
re-deriving other shapes from it:

- `View`/`Projection` (`@dxos/schema`) already re-shapes a type for presentation, but only by
  hiding/reordering properties and overriding JSON-schema annotations. It cannot rename, split,
  merge, convert values, or add a property that the base type doesn't have.
- Connectors (Linear, GitHub, Bluesky, mail) hand-write one-way mappers from an external shape
  into a `DataType.*`, and a second hand-written mapper back out. Nothing checks the two agree.
- Agents get the whole base schema, including properties irrelevant to the task, and write back
  through the same wide surface.

A lens is the missing abstraction: one declaration, two directions, laws that hold.

## 2. Why panproto

[panproto](https://github.com/panproto/panproto) is a schema engine whose layer 4
(`panproto-lens`) is exactly this: an asymmetric lens as a `get` (source → view, dropping data
into a **complement**) and a `put` (view + complement → source), with `check_laws` mechanically
verifying GetPut and PutGet. It ingests ~47 schema languages (JSON Schema, OpenAPI, Protobuf,
GraphQL, Avro, ATProto Lexicon, SQL DDL), can `lens generate` a lens by diffing two schemas,
and composes lenses (`compose`, `Protolens`/`ProtolensChain` for schema-parameterized families).

Bindings: Rust crate, `@panproto/core` (WASM, TypeScript), Python, a CLI (`schema lens
generate|apply|verify|compose|inspect`), and an MCP server + Claude Code skills
(`panproto-toolkit`) — so lenses are also agent-authorable.

The interop boundary is JSON Schema, which we already have both ways:
`JsonSchema.toJsonSchema(type)` / `JsonSchema.toEffectSchema(json)` in `@dxos/echo`, plus
`Type.makeObjectFromJsonSchema` to materialize a runtime type from a JSON schema.

Reusing panproto rather than writing our own lens algebra buys us: the law checker, the
generator, and — for free — the entire external-protocol catalogue, which is where the
connector-mapper payoff lives.

**Unverified from docs, must be confirmed in Phase 0** (all TS SDK surface, per the book):
`Panproto.init()` (loads WASM), `MigrationBuilder.map/.mapEdge/.resolve/.compile` →
`CompiledMigration.lift/.get/.put`, `LensHandle.get/.put/.checkLaws/.toJson`,
`Panproto.composeLenses`, `Panproto.parseJson/.toJson/.convert`, and `get()` returning
`GetResult { view, complement }`.

## 3. Model

### 3.1 The lens

```
Lens = { source: TypeDXN, target: JsonSchema, spec: LensSpec }
get : Source          -> { view: Target, complement: Complement }
put : Target, Complement -> Source
```

Two ways a lens exists in the system, and we want both:

1. **Code-defined** — a lens spec shipped in a package and registered at startup (built-ins:
   the examples in §5). Versioned with the code, unit-tested, no space round-trip.
2. **ECHO-stored** — a `Lens` object in a space, so a user (or an agent) can author one and
   share it. Mirrors how stored `Type` entities already work, and is what makes "define a lens"
   a product feature rather than a build-time concern.

Proposed ECHO type (`org.dxos.type.lens`):

```ts
Schema.Struct({
  name: Schema.optional(Schema.String),
  source: Schema.String,                    // typename@version of the base type
  target: internal.JsonSchemaType,          // the lensed shape (JSON Schema)
  spec: Schema.Unknown,                     // panproto lens spec (JSON form of the DSL)
  overlayPolicy: Schema.optional(...),      // see §3.3
})
```

`target` is stored rather than derived so a lens keeps working when the engine is not loaded
(forms/tables need the shape even if `put` isn't available in that context).

### 3.2 Three fidelity tiers

Not every lens needs the WASM engine at runtime, and the cheap tier covers most of the value.
Build them in this order:

- **T1 — snapshot codec.** `Lens.get(obj)` returns a plain object; `Lens.put(view, obj)` writes
  it back inside a single `Obj.update`. Read-modify-write. No reactivity, no CRDT granularity.
  Sufficient for agent tools, connectors, import/export, and every test.
- **T2 — live proxy.** A reactive proxy over the ECHO object that maps property reads and
  inverts property writes, so `Obj.atom` subscriptions and `Obj.update` keep working and the UI
  stays live. Only sound for **structural** lenses — those whose spec compiles to a
  path→path table with a pointwise value codec (rename, hoist, wrap, default, enum/scalar
  convert). Compile that table once from the spec; reject (fall back to T1) if the spec contains
  a non-pointwise op. `Obj.getValue`/`Obj.setValue` (key-path based) are the primitives.
- **T3 — whole-document lens.** Arbitrary `get`/`put` through the engine over the whole object's
  JSON. Needed for the markdown ↔ rich-text case (§5.D). Writes must be **diffed, not
  replaced**: for string CRDT fields go through `Text.update(obj, path, newText)`, which applies
  a minimal Automerge diff and preserves cursors, anchors, comments, and concurrent edits.

### 3.3 Where the extra data lives

Two different things get conflated here; keep them separate.

**Complement** — base data that `get` dropped. It needs no storage in the normal case: the base
object is still in the database, so `put` re-reads it. Storage is only required when the view
travels away from the object (sent to an agent, serialized to a peer, exported) and is written
back later — then the complement rides along with the view as an opaque blob.

**Overlay** — view properties with no counterpart in the base type. These _must_ persist, and
this is where the user's idea lands: the object's **ECHO annotation dictionary**.
`EntityMeta.annotations` is a `Annotation.Dictionary` (`Record<Annotation.Key, unknown>`) on
every entity, read/written with `Annotation.get/set/update` and `Annotation.getDictionary/
setDictionary`, with `Annotation.atom`/`atomProperty` giving per-annotation reactivity — so an
overlay field is as live as a real property.

```ts
const LensOverlay = Annotation.make({
  id: 'org.dxos.annotation.lens.overlay',
  schema: Schema.Record({ key: Schema.String, value: Schema.Unknown }), // lensDxn -> { prop: value }
});
```

Rules:

- Keyed by lens DXN, then by property name — two lenses never collide, and dropping a lens
  drops its overlay cleanly.
- Every overlay value is validated against that property's schema in the lens `target` before it
  is written. An overlay is not an escape hatch for untyped data.
- Overlay properties are **second-class by construction**: not queryable by ECHO queries, not
  indexed, not visible to consumers that don't load the lens. Say this loudly in the docs — the
  moment a field needs to be queried it should be **promoted** into the base type (a panproto
  migration from overlay → schema property, which is the engine's day job).
- `overlayPolicy` on the `Lens` object decides what happens to a view property that is neither
  mapped nor declared overlay-able: `reject` (default, write throws) or `store`.

### 3.4 Composition and identity

- Lenses compose (`composeLenses`), so `Task → GTD → LLM-tool-shape` is one chain. Compose at
  registration, not per call.
- A lens does not change object identity. `Obj.getDXN`, refs, and relations are untouched;
  `id` is never lensed.
- Queries stay on the base type. A lens applies to results, post-query. Querying _through_ a
  lens (rewriting a `Filter` on lensed property names into base property names) is a natural
  Phase 5 extension for structural lenses only — explicitly out of scope for v1.

## 4. Integration points

| Surface                        | How a lens plugs in                                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Form` (`@dxos/react-ui-form`) | Render the lens `target` schema; `onSave` goes through `put`.                                                                                                           |
| Table / Kanban                 | `View.Projection.schema` is already an optional "schema override" — point it at the lens target and let `ProjectionModel` project that instead of the base JSON schema. |
| Agent tools                    | Serialize the lensed view (smaller, task-shaped) instead of the base object; writes validated by the lens. Highest-value surface, lowest UI cost.                       |
| Connectors                     | Replace hand-written in/out mappers with a generated lens pair; the law check becomes the mapper's test.                                                                |
| Preview / Card                 | Lens supplies label/icon-bearing properties for shapes the base type doesn't name.                                                                                      |

## 5. Examples to start with

Ordered by ratio of insight to risk.

### A. `DataType.Task` → "GTD task" — **start here**

`packages/sdk/types/src/types/Task.ts`. Pure structural, tiny, entirely unit-testable, and it
exercises every mechanism at once:

- `status: 'todo' | 'in-progress' | 'done'` ↔ `done: boolean` + `stage` (enum → bool + enum:
  a lossy `get` whose complement carries the discarded distinction — the textbook lens law case).
- `priority: 'none'…'urgent'` ↔ `priority: 1..5` (scalar convert, total both ways).
- `estimate` (number, minutes) ↔ `estimateHours` (number) — unit conversion, where round-trip
  fidelity under floating point is a real and instructive failure.
- **Overlay**: `context` (`@home`/`@work`) and `waitingOn` — no counterpart on `Task`, straight
  into the annotation dictionary.

Deliverable is a node test that builds a `Task`, gets the GTD view, mutates it, puts it back,
and asserts both the base object and `checkLaws`.

### B. `DataType.Organization` → schema.org `Organization`

`packages/sdk/types/src/types/Organization.ts` already cites schema.org in a comment and
diverges from it: `name`/`website`/`image` vs `legalName`/`url`/`logo`; our `status` enum is
CRM-specific and has no schema.org counterpart. panproto ingests schema.org's vocabulary
directly, so this is the first lens we should try to **generate** rather than hand-write.
Overlay candidates: `tier`, `arr`, `owner`. Demonstrates the "one object, two teams, two shapes"
story without any new UI.

### C. `DataType.Task` → Linear / GitHub issue

The connector case, and panproto's home turf (it ingests the GraphQL/OpenAPI schemas those APIs
publish). Bigger, and it drags in auth/sync concerns, so keep it Phase 5 — but it is the
argument for why the engine belongs in the runtime rather than only at author time.

### D. Markdown `Document` → rich text — the one to prototype early, separately

`packages/plugins/plugin-markdown/src/types/Markdown.ts`: `Document.content` is a
`Ref<Text.Text>` and `Text.content` is a markdown **string**. The lens target is a block tree:

```
{ blocks: [ { type: 'heading', level: 2, children: [...] },
            { type: 'paragraph', children: [{ type: 'text', value: '…' }] } ] }
```

- `get` = parse markdown → mdast → normalized block JSON. `remark`/`remark-gfm`/
  `mdast-util-to-hast` are already in the workspace catalog and used by `@dxos/react-ui-markdown`.
- `put` = serialize blocks → markdown, then write via `Text.update`, so the change lands as a
  minimal Automerge diff rather than a whole-document replacement.

The hard part is that **markdown is not canonical**: `*` vs `-` bullets, ATX vs setext headings,
hard-wrap column, reference vs inline links, trailing whitespace. A naive round-trip rewrites the
whole file and destroys every comment anchor and cursor in it. This is precisely what the
complement is for — stash the per-node formatting choices in the complement so `put` reproduces
byte-identical markdown wherever the tree didn't change. If panproto's complement can carry that,
this case validates the whole approach; if it can't, we learn it in a day-long spike rather than
in Phase 4.

**First consumer should be the agent, not an editor.** Letting an assistant edit a document as
blocks ("insert a section after the second heading", "retitle this heading") instead of doing
string surgery on markdown is a real capability we lack today, and it needs no ProseMirror,
no new editor, and no UI work. A rich-text _editing_ surface is a separate, later question.

## 6. Risks and open questions

1. **WASM in our runtime.** `@panproto/core` is a WASM build (~102 exported functions). Unknown:
   bundle size, whether it loads in the shared worker / `workerd` where ECHO runs, and cold-start
   cost. This gates the architecture, so it is Phase 0. Fallback if it doesn't fit: implement the
   **structural** subset natively in TypeScript (it is a path table plus value codecs — small),
   and use panproto only at author time (CLI/MCP) to generate, verify, and law-check specs that
   ship as JSON. That fallback still gets us examples A, B, and C.
2. **Reactivity.** T2 must not break `Obj.atom`. Overlay reactivity comes from
   `Annotation.atom`/`atomProperty`; base-property reactivity from the underlying proxy. The
   composite atom is the fiddly bit.
3. **Validation and trust.** A `put` must validate against the base type before writing — a lens
   is not a bypass. Conversely a read-only lens is a redaction primitive (share a space, expose a
   narrowed shape); worth naming, not worth building in v1.
4. **Versioning.** A lens pins `source` to `typename@version`. When the base type migrates, the
   lens must be re-generated or re-pinned; panproto's migration layer is the intended answer, but
   we need a policy for "lens targets a version that no longer exists".
5. **Text/CRDT granularity** for D, per §3.2.
6. **Overlay sprawl.** Overlay fields are invisible to queries and indexes. Without a promotion
   path they become a shadow schema. Promotion (overlay → real property) should be designed
   before overlays ship, even if implemented later.

## 7. Proposed layout

- `packages/sdk/lens` — `@dxos/lens`, `"private": true`. Depends on `@dxos/echo`,
  `@dxos/effect`, `@dxos/schema`; `@panproto/core` optional/lazy.
  - `Lens.ts` (ECHO type), `codec.ts` (T1), `proxy.ts` (T2), `engine.ts` (panproto binding),
    `overlay.ts` (annotation storage), `registry.ts` (built-in + stored lens resolution).
- Built-in example lenses next to the types they lens, or in `packages/sdk/lens/src/lenses`.
- React (`useLens`) lands in a follow-up package or `@dxos/react-ui-form` consumer; no plugin
  until Phase 2 proves the UI story.

## 8. References

- panproto — https://github.com/panproto/panproto
- panproto book — https://panproto.dev/book/
- `panproto-lens` (Rust) — https://docs.rs/panproto-lens/latest/panproto_lens/
- panproto toolkit (Claude Code skills + MCP) — https://github.com/panproto/panproto-toolkit
- protolab (visual bidirectional-transform editor) — https://github.com/panproto/protolab
- DXOS: `packages/sdk/schema/src/projection/projection.ts` (`ProjectionModel`),
  `packages/core/echo/echo/src/{Annotation,View,Text,Type,JsonSchema}.ts`,
  `packages/core/echo/echo/src/internal/common/types/meta.ts` (`EntityMetaSchema.annotations`).
