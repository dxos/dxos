# ui-template — DESIGN

State-driven, declaratively-described UI: what the overnight spike built, what it proved, what it
broke on, and the design that follows. Vocabulary and rules come from
[`ONTOLOGY.md`](./ONTOLOGY.md) (cited as `R-n`); the spike's code is
this package; the evidence is its stories (`ui/ui-template/System` in storybook).

## Goals

Recorded as directives, not aspirations — each shaped a decision below.

1. **Entirely state-driven layout.** The complete _published_ state of the system determines the
   layout. Nothing renders from hidden state; a snapshot of published state is a snapshot of the UI.
2. **On-the-fly layout generation.** A layout is plain data (parse of an XML surface syntax, or any
   other producer — including a model). Generating UI is producing data, not producing code.
3. **Async updates.** Data mutations land in the database; queries feed them back as new context;
   the layout re-renders. Remote updates take the same path as local ones — there is no second
   mechanism.
4. **Async dynamic loading.** Components, schemas, machines, and operations resolve through a
   URI-keyed registry, so any of them can arrive late (a plugin loading) without the template
   changing.
5. **Chainable undo.** Because state changes only through operations, the operation log is the undo
   substrate: an inverse per operation makes any chain reversible. (Spike: log only; semantics
   below.)

## The loop

```text
                       ┌────────────────────────────┐
        seed machines  │      published state       │  ui.<id> per named instance
       ┌──────────────▶│  (+ database, via queries) │◀───────────────┐
       │               └─────────────┬──────────────┘                │
       │                             │ derive context (pure)         │ operations
  ┌────┴─────┐                       ▼                               │ (the only writer)
  │ template │──parse──▶ model ──render──▶ components ──events──▶ dispatch
  └──────────┘          (data)   (renderer)             on-* → operation key
```

- **Render is pure**: template × context → UI. Context is derived from published state × query
  results by a pure function (filtering, selection resolution live here — never in a component).
- **Events carry no behavior**: an `on-*` attribute names an operation; dispatch looks it up in the
  registry, runs it, logs it. A failed operation is a log entry, not a vanished rejection.
- **Operations may mutate the database**; the mutation returns as new query results — the async-
  update path and the local-edit path are the same arrow.

## Schema

Three findings, all live in the stories:

- **Forms bind to a projection, not the stored type** (`R-5`). `Type.getSchema(Organization)`
  carries the readonly ECHO `id` as a required field; a draft can never satisfy it, and the
  rendered form exposes it for editing. The spike registers a hand-written projection
  (name/description/status/website). The real answer is `View` — query + field projection — and the
  registry should resolve a `view` key wherever it resolves a `schema` key today.
- **Save values leak non-projection keys.** The form's save payload included `id` even though the
  projection doesn't declare it; `Object.assign` onto a live ECHO object then throws
  (`id` is readonly). Operations therefore write **field by field, through `Obj.update`** — the
  projection is the whitelist.
- **The registry is the type authority.** `schema="org.dxos.type.Organization"` resolves at render
  time; an unknown key renders an inline error rather than nothing. The same lookup discipline
  should eventually be a validation pass over the whole template (as `R-8` already is for tags).

## Data structure

The data primitives table (ONTOLOGY §3) held up. The spike exercised: `schema` (registry),
`object` (selection resolution), `query` (live `useQuery` feeding context), `operation` (the only
writer). `ref`, `view`, `feed` stayed design-only. Two additions it forced:

- **Published state** is a primitive of its own: `ui.<instance-id>` slots, schema-described by the
  instance's machine, written only by operations. It is deliberately _not_ in the database — it is
  per-session UI state — but it is shaped and addressed exactly as if it could be, which is what
  would make "persist this panel's layout state" a policy change rather than a redesign.
- **The draft** (tier-1 private state): a form's in-progress edit, an editor's cursor. The system
  deliberately does not see it; it surfaces at commit points as one operation. Q3's tentative-edit
  decision and the CM-editor case are the same mechanism at two scales.

## Layout

The template grammar (see [`README.md`](../README.md)): closed kind tags, four attribute families
(`aspect`, `data-`, `item-`, `on-`), no text content, no expressions. `collection` is the only
scope-introducing node. What the spike added to the grammar:

- **`id` + `machine`**: declaring both binds a registry machine to the instance and publishes its
  state at `ui.<id>`. Publication requires the name; anonymous instances stay private.
- **Layout selection is above the template.** The ViewSwitch story holds two templates and picks by
  `ui.view.mode` — the layout _itself_ is a function of published state, and selection survives the
  swap because it lives in state, not in the tree. This is the seed of the composite-app story
  (below): a shell is a state-driven chooser over templates, recursively.

Not yet in the grammar, known gaps: conditionals (`when=`), parts (`R-10`), sub-discriminators
(`R-9`), `absent` for async bindings (`R-2`), widths/sizing (the master list needed an inline
flex-basis in the renderer — geometry belongs in the template's aspect vocabulary, not in renderer
code).

## Component libraries

The renderer is a factory closing over the registry, one function per kind tag, mapped onto
existing components: `Listbox` (collection with selection), `Form` (react-ui-form), `Combobox`,
`Flex`/`Panel`/`Input`/`Button`. Findings:

- **The mapping is thin and honest** — no wrapper components were needed; `asChild`-style
  composition and `classNames` were enough. The kinds carve the component libraries at real joints.
- **Filtering must not live in the component.** `Combobox` deliberately renders exactly the items
  given; the input text is published state and the caller derives the filtered list. MVU survives
  only because the component library allows controlled use throughout.
- **Framework independence holds at the model layer** (`model.ts`/`system.ts`/`render.ts` import no
  framework — enforced by review, provable by dependency lint). A Solid renderer is the same
  factory signature over Solid components; the ECHO binding (`useQuery`) is the only React-shaped
  dependency in the loop, and it sits in the story, not the runtime.

## Component state machines

Tonight's machines are **named state shapes**: `{ key, initial }` in the registry, seeded when a
template binds them, written by ordinary operations. The full formalism — specified here, not yet
executed:

```ts
type MachineDef = {
  key: string; // org.dxos.machine.master-detail
  stateSchema: Schema; // shape of the published slot
  initial: InstanceState;
  events: Record<
    string,
    {
      // event → transition
      operation: string; // the operation dispatched (R-3 holds)
      guard?: Path; // published-state predicate
    }
  >;
};
```

- **Transitions dispatch operations** — the machine never writes state itself, so the operation log
  stays the single history and undo sees machine transitions for free.
- **Two tiers of component state** (from discussion): _opaque_ (CM editor cursor/decorations —
  integrate at commit points via operations) and _published_ (master-detail selection —
  schema-described, addressable). A form's draft buffer is tier-1: the same rule covers both.
- **Addressing**: `id=` in the template ⇒ `ui.<id>`, generalizing `AppCapabilities.ProgressRegistry`
  (a named map of schema-described entries). Open: cross-template references (can a toolbar in one
  template observe `ui.contacts` from another? — yes if ids are app-scoped, which then needs a
  collision rule), and instance-per-item state (a machine inside a collection scope).
- **zag-js**: adoptable as an _implementation_ of `MachineDef` only if its internal state is
  snapshotted into the published slot after every transition — two sources of truth during a
  transition is the cost. The atom-native alternative stays open; the spike's evidence is that the
  minimal version (slots + operations) covered master-detail, combobox, filter, and view-switch
  without any machine formalism at all.

## Component style variants

Not exercised tonight. The design follows the aspect rule: variants are closed enums on the node
(`variant="title"`, `density="sm"`), validated per kind, mapped by the renderer onto the theme
system — never free-form classes in the template. The `Ui` schematic dialect and this grammar
should share the variant vocabulary (one more reason the aspect table is normative).

## Surfaces

The `surface` kind (app dialect) is the escape from closed-world templates into the open-world
plugin system: a template names a role + subject binding and the surface resolver picks the
component. In this system a surface is just a node whose _renderer_ delegates to the app's surface
dispatch — the template stays data. The resolution-precedence rule documented in `app.mdl`
(position-ordered candidates, not most-specific-wins) applies unchanged.

## Operations

Spike shape (borrowed from app-framework Operations, minus the plumbing):

```ts
type OperationDef<Db> = {
  key: string; // org.dxos.operation.contacts.save
  description?: string;
  handler: (ctx: { ui; payload?; db? }) => UiState | void;
};
```

- Pure with respect to `ui`; the database is the deliberate exception.
- The **payload convention** needs design: the spike passes the component's natural value (selected
  id, form values, input text). A real system wants typed operation inputs (Effect Schema, as
  app-framework already does) validated at dispatch.
- **Context injection**: "the operation is passed the current object context" worked without
  passing anything — handlers read the selection from `ui`. That is the MVU dividend: operations
  need no ambient arguments because the state is complete.

### Undo

Design (log-only tonight): an operation optionally declares `undo`, either an inverse operation
key + payload derived at dispatch time (`(ctx) => ({ operation, payload })`, captured _before_ the
handler runs, when the old value is still readable) or `'snapshot'` (the dispatcher records the
`ui` slot it replaces). The log then _is_ the undo stack; `undo`/`redo` are themselves operations,
so they appear in the log and redo chains compose. Database mutations undo through inverse
operations only — never state snapshots — because the database is shared and may have moved.

## Composite app state (plugins, app-graph)

The extrapolation the spike argues for: **an application is the fixed point of this loop.**

- A **plugin** contributes registry entries — components, schemas/views, machines, operations,
  templates, surface implementations. The registry is the composition surface; the app-graph is a
  _derived view_ of it (nodes/actions computed from contributed entries + data), exactly as today's
  plugin capabilities work, but with layouts as first-class contributions.
- The **shell is a template like any other** — sidebar, deck, planks are `layout`/`container`
  nodes whose children are chosen by published state (`ui.deck.planks`, `ui.sidebar.open`). The
  ViewSwitch story is this at toy scale: layout choice is a state read; navigation is an operation
  (`layout.open` writes `ui.deck`); the deck's chain rule (app dialect `deck.chain`) is a machine.
- **Layouts update app state only via operations** — including navigation, plank management, and
  machine transitions. No second channel. This is what makes app-level undo _possible at all_:
  closing a plank is as reversible as renaming an organization, because both are logged operations.
- **Dynamic plugins** = registry mutation at runtime. Because templates reference by URI, a newly
  arrived plugin's contributions are picked up by the next render; a missing reference is a visible
  error (`R-8`), not a blank region — which is the honest failure mode for "async dynamic loading
  of components".

Open questions, ranked: (1) published-state addressing across templates/plugins (namespace by
plugin? by template instance?); (2) operation payload typing and capability injection (what does a
handler get besides `ui`/`db`?); (3) where derived context lives when it is shared (today a story
function; in an app, a memoized selector layer — effectively Views over state); (4) the
`when=`/parts/sizing grammar gaps; (5) whether machine transition tables earn their keep over
slots + operations (the spike says: not yet).

## Verification (2026-08-29)

All in `System.stories.tsx`, one `DefaultStory`, per-story layout/context; `EchoTestBuilder`
database (the full client harness wedged the dev server on space boot and is not needed):

| Story               | Verified in browser                                                              |
| ------------------- | -------------------------------------------------------------------------------- |
| List                | 6 rows from a live query                                                         |
| Form                | projection schema renders; no readonly `id` field                                |
| MasterDetail        | click → `select` op → published state → form; save → `Obj.update` → query → list |
| MasterDetailToolbar | Add → draft → save → `db.add` (new row); Qualify writes the selection            |
| Combobox            | typing dispatches `picker.input`; items narrow from state; pick fills the form   |
| FilterList          | `filter.text` state narrows the list                                             |
| ViewSwitch          | `view.mode` swaps the whole layout; selection survives the swap                  |

Known defects, deliberate: the uncontrolled form does not refresh when an external write lands on
the selected object (draft snapshot isolation — needs a merge policy); machine slots reset when the
template is edited (re-seed on parse); the operation log caps at 20 entries.
