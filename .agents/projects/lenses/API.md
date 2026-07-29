# ECHO Lenses — Proposed API

Concrete surface for [DESIGN.md](./DESIGN.md). Nothing here is implemented; the point is to argue
about signatures before writing code. Everything is shaped to match the neighbouring modules
(`Obj`, `Type`, `View`, `Annotation`) so a lens reads as an ECHO concept rather than a bolt-on.

**Scope:** the near-term goal is a proof of concept — _multiple interfaces, each written against its
own schema, driving the same object_. Foreign-type adaptation and migration support are long-term
payoffs this shape enables; they are explicitly not being built first.

**Where it ships:** `@dxos/echo-lens`, a sibling package rather than a change to `@dxos/echo` — a
lens is just another object, so nothing here needs to be inside core to work. Signatures are written
as if the module were already `Lens` in core, so promotion is an import-path change (DESIGN.md
§2.1). `Obj.lens` below reads `Lens.of` until then.

## 0. What "first-class" does and doesn't require

**It does require:** a namespace module in `@dxos/echo` beside `Type`/`View`/`Annotation`; the
static-or-persisted duality types already have; a registry; React hooks with the same shape as
`useObject`.

**It does not require a new entity kind.** `EntityKind` is a closed set (`Object`, `Relation`,
`Type`), and `Type` earns its own kind because it _is_ schema — the database validates and indexes
against it. A lens is metadata _about_ two types; it can be an ordinary ECHO object of type
`org.dxos.type.lens`, added with `db.add()` and queried with `Filter.type(Lens.Lens)`. Additive and
reversible. If lenses later need to participate in indexing or query planning, promoting them to a
kind is a separate, evidence-backed decision.

## 1. One shape: a lens binds two declared types

```ts
export const make: <S extends Type.AnyObj, T extends Schema.Schema.Any>(
  id: string,
  source: S,
  target: T,
  mapping: Mapping<S, T>,
) => Lens<S, T>;
```

Both ends are always written out. There is no mode where the target is computed from the mapping —
that was the earlier proposal and it is dropped. Consequences, all good:

- **Types are free.** `Lens.Target<typeof L>` is just `Type.InstanceType<typeof TargetType>`. No
  type-level transform machinery, no combinator chain whose generics have to track renames. This
  dissolves what was the hardest open problem in the design, and it dissolves it for _persisted_
  lenses too: a lens loaded from a space that targets a statically-declared type still yields that
  static type at compile time.
- **Interfaces are written once, against the target type**, and work for every source that maps to
  it — which is the entire point.
- **The mapping is the only thing anyone authors**, so all design effort goes into making mappings
  short (§2) rather than into schema-construction combinators.

The target is normally a `Type.Obj` (an ECHO object type). It may be a plain `Schema.Schema.Any`
where no object of that shape is ever stored — the rich-text block tree (§3) is the case. Typename
dispatch (§4.1) only applies when the target is a `Type.Obj`.

## 2. Mappings — resolution order and shorthands

The mapping is **partial**. Every target property resolves in this order:

1. **Explicit entry** in the mapping.
2. **Automatic** — a source property with the same name and a compatible type. Nothing to write.
3. **Overlay** — no counterpart; stored in the object's annotation dictionary (§5).

Source properties that no target property consumes are **dropped** from the view and restored by
`put` from the live object.

```ts
export const IssueAsTask = Lens.make('org.dxos.lens.issue-as-task', Linear.Issue, DataType.Task, {
  // 2. `title` and `description` match by name and type — omitted entirely.

  // Rename shorthand: a bare string names the source property.
  estimate: 'estimateMinutes',

  // Codec shorthand: rename + a total value conversion.
  priority: Lens.from('urgency', Lens.Codec.scale(1 / 10)),

  // Full form, for anything the shorthands can't say.
  status: {
    from: ['state'],
    get: ({ state }) => STATE_TO_STATUS[state],
    put: (status) => ({ state: STATUS_TO_STATE[status] }),
  },

  // Read-only: rendered, never written back.
  createdBy: Lens.readOnly('author'),

  // 3. `assigned`, `project` unmentioned and unmatched -> overlay-backed automatically.
});
```

```ts
export type Mapping<S, T> = {
  readonly [K in keyof T]?: keyof S | Codec<S, T[K]> | Derived<S, T[K]>;
};

export type Derived<S, V> = {
  /** Source properties this reads — drives the reactive subscription and what `put` receives. */
  readonly from: readonly (keyof S)[];
  readonly get: (source: Pick<S, ...>) => V;
  /** Returns only the source properties that change. Omit for a read-only property. */
  readonly put?: (value: V, source: Pick<S, ...>) => Partial<S>;
};
```

Three things fall out of `Derived` rather than being bolted on: `from` is the complement made
explicit, so `put` receives exactly the source it declared and nothing is carried out-of-band;
returning `Partial<S>` _is_ write-minimality (§6), enforced by the compiler; and omitting `put`
gives read-only computed properties for free.

**Automatic mapping requires type compatibility, not just a name match.** Two `status` properties
with different enum literals are _not_ auto-mapped — and they must not silently overlay either,
because that would record the same fact twice and let the copies drift. That case is reported as
`suspicious` (§2.1) and stays unmapped until someone says what it means.

### 2.1 Coverage — convenient, but never silent

Automatic mapping and auto-overlay are conveniences; neither may become a place where mistakes
hide. The lens reports what it decided:

```ts
export const coverage: (lens: Lens.Any) => Coverage;

export type Coverage = {
  /** Target properties resolved by an explicit mapping entry. */
  readonly explicit: readonly string[];
  /** Target properties auto-mapped by name and compatible type. */
  readonly automatic: readonly string[];
  /** Target properties with no counterpart — stored in the annotation dictionary. */
  readonly overlaid: readonly string[];
  /** Source properties absent from the view; restored by `put`. */
  readonly dropped: readonly string[];
  /**
   * Unresolved: a name match whose types are incompatible, or an overlay whose name resembles a
   * source property. Never auto-resolved — this is the case that would silently duplicate a fact.
   */
  readonly suspicious: readonly { property: string; candidates: readonly string[] }[];
};
```

Pin the expected coverage in a test and a mapping that silently stopped matching — because the
source type renamed a property — shows up as a diff rather than as data quietly moving into
annotations.

## 3. Coded lenses — same signature, opaque mapping

For transformations no per-property mapping can express (parsing, tree construction,
serialization), the mapping is a whole-object `get`/`put` pair. Everything else is identical.

```ts
export const RichText = Lens.coded('org.dxos.lens.rich-text', DataType.Text, BlockTree, {
  get: (text) => parseBlocks(text.content), // remark -> mdast -> blocks, each carrying its source range
  put: (next, prev) =>
    diffBlocks(prev, next).map(({ block, markdown }) => ({
      kind: 'splice' as const,
      path: ['content'],
      start: block.range[0],
      deleteCount: block.range[1] - block.range[0],
      insert: markdown,
    })),
});
```

`Lens.make` and `Lens.coded` both produce a `Lens<S, T>`; no consumer can tell them apart.

## 4. Using a lens

### 4.1 Live handle

The lensed object _is_ an object, so every `Obj.*` function keeps working — and it carries the
**target's** typename, so everything that dispatches on typename (surfaces, `react-surface`
resolution, forms, cards, navtree) resolves the interface written for the target type.

```ts
export const lens: <S, T>(obj: S, lens: Lens<S, T>) => Obj.OfShape<T>; // in Obj

const task = Obj.lens(issue, IssueAsTask);
Obj.getTypename(task); // 'org.dxos.type.task' — existing Task UIs render it
Obj.getURI(task); // still resolves to the underlying issue
Obj.update(task, (task) => {
  task.status = 'done'; // -> assign state
  task.project = ref; // -> overlay write
});
```

|                         | value                                                |
| ----------------------- | ---------------------------------------------------- |
| `task.id`               | the base object's id                                 |
| `Obj.getURI(task)`      | `=== Obj.getURI(issue)`                              |
| `Obj.getTypename(task)` | the **target's** typename                            |
| `Obj.getMeta(task)`     | the base object's meta, overlay annotations included |

Edge cases (`Obj.clone`, `Obj.getVersion`, branch APIs) get resolved as they come up rather than
designed around up front.

**`put` totality is the thing to watch.** An interface written for the target will write anything
the target schema permits, including into properties whose mapping is lossy or has no inverse. Each
needs a real inverse, an overlay, or `Lens.readOnly` — and a read-only property must be _visibly_
read-only in the form, not silently dropped on save. `checkLaws` (§8) over generated target
instances is what catches the gap.

### 4.2 Snapshot

```ts
export const get: <S, T>(obj: S, lens: Lens<S, T>) => T;
export const put: <S, T>(obj: S, lens: Lens<S, T>, view: Partial<T>) => void;
```

`put` takes a `Partial<T>` by design — there is no signature that accepts a whole view and writes it
wholesale (§6).

### 4.3 React

Mirrors `useObject`'s tuple and overload shape exactly.

```ts
export const useLens: {
  <S, T>(obj: S, lens: Lens<S, T>): [T, LensUpdateCallback<T>];
  <S, T>(obj: S | undefined, lens: Lens<S, T>): [T | undefined, LensUpdateCallback<T>];
  <S, T, K extends keyof T>(obj: S, lens: Lens<S, T>, property: K): [T[K], PropUpdateCallback<T[K]>];
};

const [done, setDone] = useLens(issue, IssueAsTask, 'status'); // subscribes to `state` only
```

The property overload matters for the collaboration stories: it subscribes through `from` to just
the source properties that feed it, so a peer editing `title` doesn't re-render a status control.

## 5. Overlay storage

Target properties with no source counterpart live in the object's annotation dictionary
(`EntityMeta.annotations`), keyed by lens DXN then property, and validated against the target
schema's declaration for that property — which always exists, since the target is always written
out.

```ts
const LensOverlay = Annotation.make({
  id: 'org.dxos.annotation.lens.overlay',
  schema: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
});
```

Overlay values are reactive (`Annotation.atom`/`atomProperty`) and collaborative, but **not
queryable and not indexed**. A field that needs querying belongs in the base type.

## 6. The write vocabulary

`put` returns a list of writes rather than a new source object, so a lens _cannot_ express "rewrite
the whole object" without enumerating every property. Write-minimality (DESIGN.md §6.4) becomes a
type error rather than a rule people remember.

```ts
export type Write =
  | { readonly kind: 'assign'; readonly path: Obj.KeyPath; readonly value: unknown }
  | {
      readonly kind: 'splice'; // string CRDT: preserves cursors, anchors, concurrent edits
      readonly path: Obj.KeyPath;
      readonly start: number;
      readonly deleteCount: number;
      readonly insert: string;
    }
  | { readonly kind: 'overlay'; readonly property: string; readonly value: unknown };

/** Apply writes in a single change transaction. Validates against the base type first. */
export const applyWrites: (obj: Obj.Unknown, writes: readonly Write[]) => void;
```

There is deliberately no `replace`. `splice` is what the rich-text lens needs and what a
`Partial<S>`-shaped API could never carry.

## 7. Persistence and registry

A lens object is an ordinary ECHO object, mirroring stored types:

```ts
export const Lens: Type.Obj<Lens>; // org.dxos.type.lens

await db.add(Lens.toObject(IssueAsTask));
const runtime = Lens.fromObject(stored);

export const register: (lens: Lens.Any) => void;
export const lensesFor: (source: Type.AnyObj | string) => readonly Lens.Any[];
export const sourcesFor: (target: Type.AnyObj | string) => readonly Lens.Any[];
```

`lensesFor` answers "how else can I view this object"; `sourcesFor` answers "what can this
interface accept" — the reverse lookup that makes one UI serve many source types.

Unlike stored _types_, a persisted lens still yields static types when its target is a statically
declared type (§1), so this path is less lossy than the stored-schema analogue.

## 8. Laws

```ts
export const checkLaws: (lens: Lens.Any, options?: { instances?: number }) => LawCheckResult;
```

Property-based, over instances built from the source type's `GeneratorAnnotation`s (`createProps`,
`@dxos/schema/testing`) — `DataType.Task` already annotates every property, so zero fixtures. Also
run in reverse over generated _target_ instances, which is what surfaces the `put`-totality gaps
described in §4.1.

## 9. Later

Deliberately not in the proof of concept, recorded so the shape doesn't preclude them:

- **Generation** — `Lens.generate(source, target)` proposing a draft mapping from two schemas, with
  unresolvable value semantics reported as typed holes rather than guessed. Bind mode is exactly its
  input, so this fits without redesign.
- **Migration support** — `Lens.promote(obj, lens)` draining overlay values into base properties
  that now exist, plus a policy for the mid-migration window where a field is queryable for some
  objects and not others. Long-term; the proof of concept does not attempt it.
- **Query integration** — `db.query(...).lens(L)` as post-query mapping; rewriting filters over
  target property names into source terms is strictly later and only sound for pointwise mappings.

## 10. Open questions

1. **Type compatibility for automatic mapping** (§2) — how strict? Identical AST, or
   assignability? Optionality mismatches (`string` vs `string | undefined`) are the common case and
   should probably auto-map in the safe direction only.
2. **`Lens.readOnly` in forms** — the form has to render the property as non-editable, which means
   the marking must survive into the derived JSON Schema the form consumes, not just live in the
   mapping.
3. **Overlay reactivity granularity** — `useLens(obj, lens, 'project')` should subscribe via
   `Annotation.atomProperty` to one key, not the whole dictionary.
4. **`Lens.Codec` totality** — `scale(1/10)` is not an isomorphism over floats. Either codecs
   declare a tolerance, or `checkLaws` compares with an epsilon and says so out loud.
5. **Naming** — `Lens.get`/`Lens.put` are the lens-theoretic terms, but `Lens.get(obj, lens)` next
   to `Obj.getValue(obj, path)` may read oddly in review.
6. **Two sources, one target** (§7) — if a UI can be handed a `Linear.Issue` or a `GitHub.Issue`
   both lensed to `Task`, does anything downstream need the _original_ typename (icons, "open in
   Linear", delete semantics)? Reachable via `Obj.getURI`, but nothing signals that it should look.
