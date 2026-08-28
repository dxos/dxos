---
name: reactivity
description: House rules for reactive UI — the three state stores (React state, atoms, ECHO
  objects), the ECHO-to-atom bridge, and the anti-pattern catalog. Use when adding or placing
  component state, reading ECHO objects or refs in a component, rendering a list of refs, deriving
  a value from several reactive sources, when UI shows stale data or doesn't update until you
  navigate away and back, or when reviewing a diff that touches plugin containers or components.
---

# Reactivity

How we build reactive UI, and the anti-pattern catalog that enforces it — applied while writing a
component and as a review pass over a diff.

## The three stores

Every piece of UI state lives in exactly one of three stores. Most reactivity bugs are a placement
or bridging mistake.

1. **React state** (`useState` / `useReducer`) — ephemeral and component-local: an open/closed
   flag, an unsubmitted draft. If a second component reads it, or it should survive unmount, it
   doesn't belong here.
2. **Atom state** (`@effect/atom`) — shared or derived reactive state: anything two components
   read, anything **computed from** other reactive sources. Read with `useAtomValue`, write with
   `useAtomSet` / `useAtomState`, compose with `Atom.make((get) => ...)`, make two-way with
   `Atom.writable`. Settings and ViewState are atom-state instances with dedicated homes — see
   [composer-ui](../composer-ui/SKILL.md) §State management.
3. **ECHO objects** — persistent, shared, collaborative data. An ECHO object is a **singleton**:
   one live proxy per object id, with stable identity. That stability is why prop comparison never
   detects a mutation, and why reading an object during render subscribes to nothing — the data is
   reactive, the read is not.

Atoms behave like signals, with one difference that drives everything below: subscriptions are
**explicit** — `get(atom)` inside a computation, `useAtomValue` in a component — never implicit
from touching a value during render. There is no tracking scope watching your reads; a read
without a subscription is a one-time copy.

## The bridge

Object reactivity **derives into** atom reactivity. `Obj.atom(objOrRef)` and
`Obj.atomProperty(objOrRef, key)` expose an object — or a ref's target, across its async load — as
an atom; `useObject` is a prebuilt subscription over these atoms, and `useQuery` subscribes to a
query result (which also has an `.atom` getter for atom-space use).

The rule: for a **simple** subscription — one object, one ref, one property, one query — use the
hook. For anything more — combining objects, aggregating over refs, mixing ECHO data with settings
or view state — build a **derived atom** and subscribe to that one atom.

Refs load **asynchronously**. `ref.target` is a synchronous peek: `undefined` until the target is
in memory, and it never notifies when the target arrives. The atoms and hooks trigger the load and
re-fire on resolution; render paths that peek `.target` wedge on cold load.

Subscriptions return **snapshots** — immutable values for reading. Writes go through the live
object (`Obj.update`, or the update callback `useObject` returns), never the snapshot.

The granularity rule: **subscribe where you read, as narrowly as you read**. Objects, refs, and
atoms all travel down the tree as props; the subscription lives in the component that reads the
value and covers only what it reads. A list subscribes to its membership; each tile subscribes to
its own item's fields. A parent that subscribes on behalf of its children re-renders the whole
subtree for every change in any child's data. (Prop identity: objects and atoms are stable; refs
are stable when taken from a snapshot, but a live property read mints a fresh `Ref` wrapper per
read — one more reason reads go through subscriptions.)

## Process

For each component in the change:

1. Place every piece of state in one of the three stores; flag state held in the wrong one.
2. List every reactive read: a property access on an ECHO object, `.target` on a ref, a query
   result, an atom value.
3. Check each read is backed by a subscription from the table below. A bare read compiles and
   renders correctly once, so it survives manual testing — only navigation or a concurrent edit
   exposes it.
4. Check each subscription sits in the component that consumes it, not an ancestor, and that
   multi-source derivations are single derived atoms rather than hook pileups.
5. Check writes target the live object (ECHO) or the atom's setter (atoms).

Every anti-pattern below violates one of these five checks.

## Which API

| You have                      | You want                        | Use                                            |
| ----------------------------- | ------------------------------- | ---------------------------------------------- |
| ECHO object                   | reactive reads of its fields    | `useObject(obj)` → `[snapshot, update]`        |
| ECHO object or ref            | one field only                  | `useObject(objOrRef, 'field')`                 |
| `Ref<T>`                      | reactive snapshot of the target | `useObject(ref)` (loads + subscribes)          |
| `Ref<T>`                      | the **live** target object      | `useResolveRef(ref)` (subscribes to load only) |
| array of refs                 | a list                          | pass each ref to a leaf tile (see §6)          |
| database + type               | a reactive collection           | `useQuery(db, Filter.type(T))`                 |
| several reactive sources      | one derived value               | `Atom.make((get) => ...)` + `useAtomValue`     |
| a derived value               | two-way binding                 | `Atom.writable(read, write)`                   |
| object or ref, inside an atom | subscription in the computation | `Obj.atom(objOrRef)` / `Obj.atomProperty`      |
| an atom                       | value in a component            | `useAtomValue` / `useAtomState` / `useAtomSet` |

`useResolveRef` returns the live object and re-renders when the ref _loads_, but not on mutations
of the target — use it when a handler or child API needs the real object (`Obj.getDatabase`,
operation payloads), and pair it with `useObject` when you also render its fields.

## Anti-patterns

### Placement

**1. Shared or persistent state in React state.** `useState` for a value another component reads,
or that should survive unmount, forces prop-drilling and effect-syncing to spread it. Promote it:
an atom if it's UI state, an ECHO object if it's data. The inverse holds too — an open/closed flag
or scroll position has no business on an ECHO object, where every change syncs to peers.

**2. Effects syncing between stores.** A `useEffect` that mirrors an ECHO field into `useState`,
or copies one atom into another, creates a second source of truth that goes stale on every remote
edit. Derive, don't sync: read the source through its subscription, or wrap it in a derived atom.
A value that must be both editable and shared belongs on the ECHO object, edited via `Obj.update`.

### Subscription

**3. Bare property read in render.** `<h1>{doc.title}</h1>` on a live ECHO object renders once and
never updates; the object reference is stable, so no prop change ever re-renders it. The symptom:
mutations (especially to nested arrays/structs via `Obj.update`) appear only after navigating away
and back. Subscribe and read the snapshot:

```tsx
const [doc] = useObject(subject);
return <h1>{doc?.title}</h1>;
```

A surface receiving an ECHO subject (e.g. `AppSurface.ObjectArticleProps<T>`) MUST do this at the
point it reads fields.

**4. `ref.target` in render.** Returns `undefined` on cold load and never re-renders when the
target arrives — the component wedges empty. `useObject(ref)` calls `ref.load()` internally and
re-renders on resolution; so does `useResolveRef(ref)` when you need the live object rather than a
snapshot. `.target` is acceptable only in callbacks that run after the subscription established
the object is loaded, e.g. building an operation payload in a click handler.

**5. Whole-object subscription for one field.** `useObject(obj)` re-renders on every change to the
object. A component that renders only `obj.title` should subscribe to only that:
`useObject(obj, 'title')`. Same in atom space: `Obj.atomProperty` over `Obj.atom`. Property
subscriptions fire only when the value actually changes (content-compared, not identity).

### Lists and derivation

**6. Resolving refs in the list component.** The recurring one. A list that maps
`refs.map((ref) => ref.target)` (or `useObjects(refs)`) to build item data has two defects: cold
loads drop items or need a re-render trigger hack, and the list now subscribes to every element,
so one item's edit re-renders every tile. The list owns exactly **one** subscription — the
membership (the ref-array property, or the query) — so it re-renders on add/remove/reorder and
nothing else. The refs pass through unresolved; each leaf owns the subscription to its own item:

```tsx
// List: subscribes to membership only.
const [refs] = useObject(thread, 'messages');
{refs?.map((ref) => (
  <MessageTile key={ref.dxn.toString()} message={ref} />
))}

// Leaf: owns its subscription, renders a fallback until loaded.
const MessageTile = ({ message: messageOrRef }: { message: MessageOrRef }) => {
  const [message] = useObject(messageOrRef);
  if (!message) return null; // or a skeleton — the tile re-renders when the ref resolves
  ...
};
```

`useQuery` at the list level is already granular: query subscriptions fire on membership and order
changes only, not on item property changes. So when membership is queryable — the members carry an
ECHO parent edge to the container, or a back-ref — prefer sourcing the list from a **scoped query**
over walking a ref array at all: `useQuery(db, Filter.and(Filter.type(Task.Task),
Filter.childOf(taskSet)))` hands the list loaded members with no per-ref load tracking anywhere
(order, where a container array is canonical, applies as a client-side sort — see
`TaskSet.orderTasks` / `useSetTasks` in `plugin-tasks/TaskSetArticle.tsx`). Model example for the
ref-array case: `ConversationStack`'s `MessageTile`
(`plugin-inbox/src/components/ConversationStack/ConversationStack.tsx`) — "owns its own
subscription (via `useObject`) so reactivity stays granular." `useObjects` is deprecated for
exactly this reason; treat any new call site as a defect. Resolving a ref array at the list level
with load-only `ref.atom` is a stopgap for a child component whose structure derives from target
fields; a tile that needs list-level context (column templates, shared handlers) gets it through
context or scalar props — the ECHO data still enters at the leaf.

**7. Hook pileup where a derived atom belongs.** N `useObject` calls plus a `useMemo` to compute
one value subscribes the component N times and re-renders it on every input change. An aggregate
("3 of 7 done"), a join across objects, or an ECHO-plus-settings combination is one derived atom;
the component subscribes to the result:

```tsx
const doneAtom = useMemo(() => Atom.make((get) => refs.filter((ref) => get(Obj.atom(ref))?.done).length), [refs]);
const done = useAtomValue(doneAtom);
```

**8. Holding a plain array where a query belongs.** A captured `db.query(...)` result, or an array
built once in an effect, doesn't update when objects are added or removed. Collections come from
the reactive `useQuery(db, Filter.type(T))` (or a `Query` AST).

### Writes

**9. Writing to the snapshot.** Snapshots are immutable values; assigning to one is a silent no-op
or a type error hidden by a cast. Writes go through the live object:

```tsx
const [gallery, updateGallery] = useObject(subject);
// either the callback:
updateGallery((obj) => { obj.images = obj.images.filter((_, i) => i !== index); });
// or Obj.update on the original subject:
Obj.update(subject, (obj) => { ... });
```

The snapshot type is intentionally narrow — cast `as Obj.Mutable<T>` inside `Obj.update`, or
`as T` to read fields not surfaced on `Snapshot<T>`.

**10. `value` + `onChange` prop pairs for shared state.** Threading a value and setter down
several layers re-couples every layer to the state's shape. Pass the **atom** as a single prop
(`Atom.writable` when the write side diverges from the read side) and let the consumer
`useAtomState` it — no provider ancestor needed, and intermediate components stay generic. Model
example: `MessageArticle`'s `optionsAtom` (a writable atom combining a settings field with
ViewState). Plain `value`/`onChange` stays fine for leaf form controls wrapping a DOM input.

## Outside components

The same model holds anywhere an atom computation runs (operations, graph builders, capability
modules): subscribe with `Obj.atom(objOrRef)` / `Obj.atomProperty` inside `Atom.make`, never peek
`.target`. The idiom tags in source are `org.dxos.echo-react.useObjectReactive` (components) and
`org.dxos.echo.objAtomReactive` (atoms) — search them for canonical usage. Capability modules that
call hooks (`useObject` in a `MarkerProvider` etc.) are browser-only; keep them out of
worker-reachable module graphs.

Purely presentational components that receive scalars need none of this — by the granularity rule
they sit below the subscription and re-render on prop change like any React component.

For _debugging_ a reactivity failure (stale panel, missing item), start from the
[debugging-ui](../debugging-ui/SKILL.md) loop; this catalog is the fix vocabulary it lands on.
