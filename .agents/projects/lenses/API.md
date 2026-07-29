# ECHO Lenses — Proposed API

Concrete surface for [DESIGN.md](./DESIGN.md). Nothing here is implemented; the point is to argue
about signatures before writing code. Everything is shaped to match the neighbouring modules
(`Obj`, `Type`, `View`, `Annotation`) so a lens reads as an ECHO concept rather than a bolt-on.

## 0. What "first-class" does and doesn't require

Worth settling up front, because it bounds the blast radius.

**It does require:** a namespace module in `@dxos/echo` beside `Type`/`View`/`Annotation`; the
static-or-persisted duality types already have; a registry; React hooks with the same shape as
`useObject`; derivation as a first-class operation.

**It does not require a new entity kind.** `EntityKind` is a closed set (`Object`, `Relation`,
`Type`), and `Type` earns its own kind because it _is_ schema — the database validates and indexes
against it. A lens is metadata _about_ two types; it can be an ordinary ECHO object of type
`org.dxos.type.lens`, added with `db.add()` and queried with `Filter.type(Lens.Lens)`. That keeps
the change additive and reversible. If lenses later need to participate in indexing or query
planning, promoting them to a kind is a separate, evidence-backed decision.

## 1. The write vocabulary — the type that makes minimality unavoidable

Start here, because it constrains everything else. §6.4 of the design requires that a lens write
assign only what changed. Rather than document that rule and hope, make it the only expressible
thing: `put` returns a list of writes, not a new source object.

```ts
/** A single minimal mutation against the base object. */
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
```

There is no `{ kind: 'replace' }`. A lens _cannot_ express "rewrite the whole object" without
enumerating every property, which is exactly the friction we want. `splice` is what the rich-text
lens needs and what a `Partial<Source>`-shaped API could never carry; `overlay` routes to the
annotation dictionary. One vocabulary covers both lenses.

Applying a batch is the only write path:

```ts
/** Apply writes in a single change transaction. Validates against the base type first. */
export const applyWrites = (obj: Obj.Unknown, writes: readonly Write[]): void;
```

## 2. Defining a lens statically

### 2.1 The builder (recommended authoring surface)

Pass-through is the default: properties the lens doesn't mention appear unchanged in the target,
so adding a property to the base type carries into every lens for free. Dropping is explicit.

```ts
export const GtdTask = Lens.make('org.dxos.lens.gtd-task', DataType.Task, (lens) =>
  lens
    // Rename + total value conversion. `Lens.Codec` is an isomorphism; both directions total.
    .rename('estimate', 'estimateHours', Lens.Codec.scale(1 / 60))
    .convert('priority', PriorityScale)

    // Lossy split. `from` declares the read dependency; `put` returns only what it changes.
    .derive('done', {
      from: ['status'],
      get: ({ status }) => status === 'done',
      put: (done, { status }) => ({ status: done ? 'done' : status === 'done' ? 'todo' : status }),
    })
    .derive('stage', {
      from: ['status'],
      get: ({ status }) => status ?? 'todo',
      put: (stage) => ({ status: stage }),
    })

    // Dropped: present in the base, absent from the view. Restored by `put` from the live object.
    .omit('project')

    // No counterpart in the base type — persisted in the annotation dictionary.
    .overlay('context', Schema.optional(Schema.Literal('@home', '@work')))
    .overlay('waitingOn', Schema.optional(Schema.String)),
);
```

The `derive` shape is where the design's constraints surface as types:

```ts
export type Derived<Source, V> = {
  /** Source properties this view property reads — drives the reactive subscription and the complement. */
  readonly from: readonly (keyof Source)[];
  readonly get: (source: Pick<Source, ...>) => V;
  /** Returns only the source properties that change. Omit for a read-only computed property. */
  readonly put?: (value: V, source: Pick<Source, ...>) => Partial<Source>;
};
```

Three things fall out of that signature rather than being bolted on:

- `from` is the complement, made explicit — `put` receives exactly the source it declared it needs,
  read live from the object, so nothing has to be carried around out-of-band.
- returning `Partial<Source>` _is_ write-minimality (§1); the compiler enforces it.
- omitting `put` yields a read-only computed property, which is a useful feature we get free.

`Lens.make` returns a value carrying both a compile-time target type and its runtime spec:

```ts
export type Target<L> = /* inferred from the builder chain */;
type GtdTask = Lens.Target<typeof GtdTask>;
//   ^ { title: string; description?: string; estimateHours?: number; priority?: 1|2|3|4|5;
//       done: boolean; stage: 'todo'|'in-progress'|'done'; context?: '@home'|'@work'; ... }
```

This is D2 from the design: static lenses get inferred types, and the same declaration emits the
spec data that the persisted path uses. One authoring surface, both worlds.

### 2.2 Coded lenses — the same interface, an opaque implementation

Proof that the interface isn't secretly panproto-shaped. The rich-text lens declares its target
schema directly (it can't be derived from a spec) and returns splices:

```ts
export const RichText = Lens.coded('org.dxos.lens.rich-text', DataType.Text, {
  target: BlockTree, // Schema.Struct({ blocks: Schema.Array(Block) })
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

Both `Lens.make` and `Lens.coded` produce a `Lens.Lens<Source, Target>`; no consumer can tell them
apart.

## 3. Persisted lenses

A lens object is an ordinary ECHO object, mirroring how stored types work:

```ts
/** ECHO entity for persisted lenses (cf. `Type.Type` for stored schemas). */
export const Lens: Type.Obj<Lens>; // org.dxos.type.lens

const lens = Lens.toObject(GtdTask); // static lens -> storable object
await db.add(lens);

const stored = await db.query(Filter.type(Lens.Lens, { source: 'org.dxos.type.task@0.1.0' })).first();
const runtime = Lens.fromObject(stored); // Lens.Lens<Obj.Any, Obj.Any> — dynamically typed
```

Same trade as stored types: `Lens.fromObject` cannot produce compile-time types, so consumers get
JSON-Schema-driven forms rather than autocomplete. Nothing new conceptually.

## 4. Derivation (D1)

```ts
/** Derive the lensed shape as a real `Type` entity. Nobody hand-writes this. */
export const deriveType: (lens: Lens.Any) => Type.AnyObj;
export const deriveJsonSchema: (lens: Lens.Any) => JsonSchema.JsonSchemaType;

const GtdTaskType = Lens.deriveType(GtdTask); // usable anywhere a Type is
await db.addType(GtdTaskType); // optional: persist so peers see the shape without the lens
```

`deriveType` composes `JsonSchema.toJsonSchema(source)` → apply spec → `Type.makeObjectFromJsonSchema`.
The `target` field on a stored lens is a cache of this, CI-asserted equal to a fresh derivation.

## 5. Reading and writing

### 5.1 Snapshot (T1)

```ts
export const get: <S, T>(obj: S, lens: Lens.Lens<S, T>) => T;
export const put: <S, T>(obj: S, lens: Lens.Lens<S, T>, view: Partial<T>) => void;

const view = Lens.get(task, GtdTask);
Lens.put(task, GtdTask, { done: true }); // partial by design: only `status` is written
```

`put` taking a `Partial<T>` is the second place minimality is structural rather than advisory —
there is no signature that accepts a whole view and writes it wholesale.

### 5.2 Live handle (T2)

The most first-class thing available: the lensed object _is_ an object, so every `Obj.*` function
keeps working.

```ts
export const lens: <S, T>(obj: S, lens: Lens.Lens<S, T>) => Obj.OfShape<T>; // in Obj

const gtd = Obj.lens(task, GtdTask);
gtd.done; // reactive read, derived from status
Obj.update(gtd, (gtd) => {
  gtd.done = true; // -> assign status
  gtd.context = '@work'; // -> overlay write
});
```

Identity is explicitly **not** lensed (design §6.5), and that has to be specified, not left to
discovery:

|                        | value                                                |
| ---------------------- | ---------------------------------------------------- |
| `gtd.id`               | the base object's id                                 |
| `Obj.getURI(gtd)`      | `=== Obj.getURI(task)`                               |
| `Obj.getTypename(gtd)` | the **derived** type's typename                      |
| `Obj.getMeta(gtd)`     | the base object's meta, overlay annotations included |

**Open question, flagged not answered:** making a proxy satisfy every `Obj.*` function is a real
cost, and some (`Obj.clone`, `Obj.getVersion`, branch APIs) may have no sensible lensed meaning. The
fallback is a distinct `LensedObj<T>` type supporting a documented subset — less elegant, far less
surface area. Decide with the Phase 2 story in hand, not now.

## 6. React

Mirrors `useObject`'s exact tuple and overload shape — the clearest signal that a lens is an ECHO
concept and not a library on top of one.

```ts
export const useLens: {
  <S, T>(obj: S, lens: Lens.Lens<S, T>): [T, LensUpdateCallback<T>];
  <S, T>(obj: S | undefined, lens: Lens.Lens<S, T>): [T | undefined, LensUpdateCallback<T>];
  <S, T, K extends keyof T>(obj: S, lens: Lens.Lens<S, T>, property: K): [T[K], PropUpdateCallback<T[K]>];
};

const [gtd, update] = useLens(task, GtdTask);
update((gtd) => {
  gtd.done = true;
});

const [done, setDone] = useLens(task, GtdTask, 'done'); // subscribes to `status` only
```

The property overload is the one that matters for the collaboration stories: it subscribes through
`from` to just the source properties that feed it, so a peer editing `title` doesn't re-render a
`done` checkbox.

## 7. Registry and resolution

```ts
export const register: (lens: Lens.Any) => void;
export const lensesFor: (type: Type.AnyObj | string) => readonly Lens.Any[]; // static + stored
export const resolve: (dxn: DXN.DXN) => Lens.Any | undefined;
```

Static lenses register at module load; stored lenses resolve from the space by source typename.
`lensesFor` is what a UI calls to offer "view this task as…".

## 8. Laws and generation

```ts
/** Property-based verification over instances built from the source type's GeneratorAnnotations. */
export const checkLaws: (lens: Lens.Any, options?: { instances?: number }) => LawCheckResult;

expect(Lens.checkLaws(GtdTask, { instances: 100 }).holds).to.be.true;
```

Zero fixtures — `DataType.Task` already annotates every property with a generator, so
`createProps` (`@dxos/schema/testing`) supplies the instances.

Generation (D3) returns a draft that is _not_ usable until its holes are closed:

```ts
export const generate: (source: Type.AnyObj, target: Schema.Schema.Any) => Promise<GeneratedLens>;

export type GeneratedLens = {
  readonly spec: LensSpec;
  /** Correspondences the diff could not infer. `Lens.fromSpec` throws while any remain. */
  readonly holes: readonly {
    readonly property: string;
    readonly reason: 'no-correspondence' | 'ambiguous-candidates' | 'value-semantics';
    readonly candidates?: readonly string[];
  }[];
};
```

Making holes a typed part of the return value — rather than a warning in a log — is what keeps
generation honest about the §3 D3 limit: `done` from `status` comes back as
`{ property: 'done', reason: 'value-semantics', candidates: ['status'] }`, because the diff can see
the two are related and cannot see _how_.

## 9. Query integration (later, structural lenses only)

```ts
db.query(Filter.type(DataType.Task)).lens(GtdTask); // -> Query<Lens.Target<typeof GtdTask>>
```

Post-query mapping first. Rewriting a `Filter` _over lensed property names_ into base-type filter
terms is a strictly later, opt-in step: it only works for pointwise mappings, and silently
degrading to a full scan would be worse than not offering it.

## 10. Open questions

1. **`Obj.lens` proxy vs a distinct `LensedObj<T>`** (§5.2) — decide with the Phase 2 story in hand.
2. **Builder op vocabulary** — `rename`/`convert`/`derive`/`omit`/`overlay` covers both lenses.
   Resist growing it until a third lens demands it; every op is a type-level transform to maintain
   and a case in the T2 compiler.
3. **`Lens.Codec` totality** — `scale(1/60)` is not an isomorphism over floats. Either codecs
   declare their tolerance, or `checkLaws` compares with an epsilon and says so out loud.
4. **Overlay reactivity granularity** — `useLens(obj, lens, 'context')` should subscribe via
   `Annotation.atomProperty` to one key, not the whole dictionary.
5. **Naming** — `Lens.get`/`Lens.put` are the lens-theoretic terms and collide with nothing, but
   `Lens.get(obj, lens)` next to `Obj.getValue(obj, path)` may read oddly in review.
