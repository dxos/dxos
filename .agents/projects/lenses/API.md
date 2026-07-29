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

## 2. Two authoring directions

There are two ways a lens comes into existence, and they differ in whether the target schema
already exists. **Bind mode is the primary one** — it serves both driving use cases — and derive
mode is the convenience case.

|                                                    | Target schema             | Use case                                                                                                                          |
| -------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Bind** — `Lens.between(Source, Target, mapping)` | already written           | adapt a foreign type to UIs you already have (§2.2); operate through a migration's destination shape before the data moves (§2.3) |
| **Derive** — `Lens.make(Source, builder)`          | computed from the mapping | a new shape over an existing type, with nothing to conform to (GTD)                                                               |

Both produce the same `Lens.Lens<Source, Target>`. In derive mode the target is an output; in bind
mode it is an input and the derived shape becomes a _check_ (§4).

### 2.1 Bind mode — both schemas exist

The mapping is **partial by design**. Anything you don't say is handled by a default:

- a target property with no mapping → **automatically overlay-backed** (annotation dictionary), no
  declaration needed;
- a source property with no mapping → dropped from the view, restored by `put` from the live object.

```ts
export const IssueAsTask = Lens.between(Linear.Issue, DataType.Task, {
  title: 'title', // identity rename
  description: 'description',
  estimate: { from: ['estimateMinutes'], get: ({ estimateMinutes }) => estimateMinutes },
  status: {
    from: ['state'],
    get: ({ state }) => STATE_TO_STATUS[state],
    put: (status) => ({ state: STATUS_TO_STATE[status] }),
  },
  // `priority`, `assigned`, `project` unmentioned -> overlay-backed automatically.
});
```

Not declaring the holes is the point: a lens should never fail to load because the target has a
field the source lacks. But silence is not the same as invisibility — see §2.4.

### 2.2 Use case: adapt a foreign type to UIs you already have

The payoff is that a lensed object carries the **target's** typename, so everything that dispatches
on typename — surfaces, plugin `react-surface` resolution, forms, cards, the navtree — resolves the
UI already written for `DataType.Task` and renders a `Linear.Issue` with it. No UI changes at all.

```ts
Obj.getTypename(Obj.lens(issue, IssueAsTask)); // 'org.dxos.type.task'
Lens.sourcesFor(DataType.Task); // reverse lookup: every type adaptable to Task
```

This is the strongest argument for §5.2's decision that `Obj.lens` returns something the whole
`Obj.*` API accepts: the adapted object has to be indistinguishable from a real one, or the
existing UI won't take it.

It also raises the stakes on `put` totality. A UI built for `Task` will write any value the `Task`
schema permits, including into properties whose mapping is lossy or absent on `Linear.Issue`. Every
such property needs either a real inverse, an overlay, or an explicit read-only marking that the
form honours — a `put` that silently drops a write is the worst outcome here. `Lens.checkLaws`
(§8) over generated `Task` instances is what catches it.

### 2.3 Use case: operate through a migration's destination shape

The base type is going to change; the lens lets code run against the new shape before, during, and
after the data moves. Three consequences worth designing for rather than discovering:

**Promotion.** Data written through the lens while the base is un-migrated lands in annotations. When
the migration runs, those values must move into the now-real properties, or they are stranded.

```ts
/** Drain overlay values into base properties that now exist. Idempotent; safe to run per object. */
export const promote: (obj: Obj.Unknown, lens: Lens.Any) => readonly Write[];
```

This is why promotion is a near-term requirement rather than the backlog item it was: use case 2
does not work without it.

**Queryability, stated plainly.** Overlay values are not queryable or indexed. Mid-migration, a new
field lives in annotations for some objects and in properties for others, so it cannot be queried
uniformly until promotion completes. Either promote eagerly (lazily per object on read/write) or
accept that new fields aren't query-safe until the migration finishes. This is a real limitation of
the approach, not a gap in the API.

**Retirement.** Once the base type has migrated, the mapping collapses to identity and the lens
should be deleted rather than left as permanent indirection. `Lens.coverage` (§2.4) makes that
visible: a lens whose every property is `mapped: identity` and whose overlay set is empty has
finished its job.

### 2.4 Coverage — don't break, but don't hide either

Auto-overlay must not become a silent typo sink. The lens reports what it did:

```ts
export const coverage: (lens: Lens.Any) => Coverage;

export type Coverage = {
  /** Target properties backed by a source mapping. */
  readonly mapped: readonly string[];
  /** Target properties with no source counterpart — stored in the annotation dictionary. */
  readonly overlaid: readonly string[];
  /** Source properties absent from the view; restored by `put`. */
  readonly dropped: readonly string[];
  /**
   * Overlaid properties that have a plausible source counterpart the mapping missed.
   * The dangerous case: storing `done` in annotations while `status` also exists lets the two
   * drift. Distinct from a genuinely new field, which is fine to overlay forever.
   */
  readonly suspicious: readonly { property: string; candidates: readonly string[] }[];
};
```

`suspicious` is the distinction between "doesn't break" and "quietly corrupts". A genuinely new
field with no counterpart overlays silently and correctly; a field that looks like it _should_ have
mapped gets flagged. Pin the expected coverage in a test and an accidental new hole shows up as a
diff rather than as data quietly landing in annotations.

### 2.5 Derive mode — the builder

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

In derive mode `.overlay(...)` stays available for declaring a new field's schema up front. It is
sugar, not a gate: an unmapped target property is overlay-backed either way.

### 2.6 Coded lenses — the same interface, an opaque implementation

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

## 4. Derivation, and what it means in each mode

```ts
/** Derive the lensed shape as a real `Type` entity. */
export const deriveType: (lens: Lens.Any) => Type.AnyObj;
export const deriveJsonSchema: (lens: Lens.Any) => JsonSchema.JsonSchemaType;

/** Bind mode: compare the mapping's implied shape against the declared target. */
export const checkTarget: (lens: Lens.Any) => Coverage;
```

- **Derive mode** — `deriveType` produces the target. Nobody hand-writes it; the stored `target` is
  a cache, CI-asserted equal to a fresh derivation. Change the base type and the target follows.
- **Bind mode** — the target is given, so derivation becomes _verification_: derive the shape the
  mapping implies, diff it against the declared target, and the difference **is** the coverage
  report (§2.4). Same machinery, opposite direction.

`deriveType` composes `JsonSchema.toJsonSchema(source)` → apply mapping →
`Type.makeObjectFromJsonSchema`.

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

Generation takes **two existing schemas** — which is exactly the bind-mode input, so it applies to
both driving use cases rather than being an exotic extra:

```ts
export const generate: (source: Type.AnyObj, target: Schema.Schema.Any) => Promise<GeneratedLens>;

export type GeneratedLens = {
  readonly mapping: Mapping;
  /** Correspondences the diff could not infer. Never silently overlaid — see below. */
  readonly holes: readonly {
    readonly property: string;
    readonly reason: 'ambiguous-candidates' | 'value-semantics';
    readonly candidates: readonly string[];
  }[];
};
```

**Two kinds of hole, and conflating them is the one thing that would corrupt data.**

- A target property with _no_ plausible source counterpart is not a hole at all — it is a new
  field, it overlays automatically (§2.1), and generation says nothing about it.
- A target property that _does_ have a plausible counterpart whose value mapping can't be inferred
  is a real hole, and it must **not** default to an overlay. Overlaying `done` while `status` also
  exists on the object stores the same fact twice, and the two drift the moment either side is
  written. Generation reports it as
  `{ property: 'done', reason: 'value-semantics', candidates: ['status'] }` — the diff can see the
  two are related and cannot see _how_ — and `Lens.coverage` flags the same case as `suspicious`
  if the mapping ships without resolving it.

## 9. Query integration (later, structural lenses only)

```ts
db.query(Filter.type(DataType.Task)).lens(GtdTask); // -> Query<Lens.Target<typeof GtdTask>>
```

Post-query mapping first. Rewriting a `Filter` _over lensed property names_ into base-type filter
terms is a strictly later, opt-in step: it only works for pointwise mappings, and silently
degrading to a full scan would be worse than not offering it.

## 10. Open questions

1. **Builder op vocabulary** — `rename`/`convert`/`derive`/`omit`/`overlay` covers both lenses.
   Resist growing it until a third lens demands it; every op is a type-level transform to maintain
   and a case in the T2 compiler.
2. **Overlay validation in bind mode.** An auto-overlaid property is validated against the target
   schema's declaration for it, which exists — so this is stricter than the derive-mode case and
   costs nothing. Confirm that holds for refs and nested structs.
3. **`Lens.Codec` totality** — `scale(1/60)` is not an isomorphism over floats. Either codecs
   declare their tolerance, or `checkLaws` compares with an epsilon and says so out loud.
4. **Overlay reactivity granularity** — `useLens(obj, lens, 'context')` should subscribe via
   `Annotation.atomProperty` to one key, not the whole dictionary.
5. **Naming** — `Lens.get`/`Lens.put` are the lens-theoretic terms and collide with nothing, but
   `Lens.get(obj, lens)` next to `Obj.getValue(obj, path)` may read oddly in review.
6. **Two sources adapting to one target** (§2.2) — if a UI can be handed a `Linear.Issue` or a
   `GitHub.Issue` both lensed to `Task`, does anything downstream need the _original_ typename
   (icons, "open in Linear", delete semantics)? `Obj.getURI` still resolves to the base object, so
   the information is available — but nothing currently makes a consumer aware it should look.
