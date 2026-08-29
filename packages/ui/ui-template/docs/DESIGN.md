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
        seed machines  │      published state       │  ui.<idPath>.<name> per slot
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

- **Forms bind to a projection, not the stored type** (`R-5`). `Type.getSchema(Task)`
  carries the readonly ECHO `id` as a required field; a draft can never satisfy it, and the
  rendered form exposes it for editing. The spike registers a hand-written projection
  (title/description/status). The real answer is `View` — query + field projection — and the
  registry should resolve a `view` key wherever it resolves a `schema` key today.
- **Save values leak non-projection keys.** The form's save payload included `id` even though the
  projection doesn't declare it; `Object.assign` onto a live ECHO object then throws
  (`id` is readonly). Operations therefore write **field by field, through `Obj.update`** — the
  projection is the whitelist.
- **The registry is the type authority.** `schema="org.dxos.type.Task"` resolves at render
  time; an unknown key renders an inline error rather than nothing. The same lookup discipline
  should eventually be a validation pass over the whole template (as `R-8` already is for tags).

## Data structure

The data primitives table (ONTOLOGY §3) held up. The spike exercised: `schema` (registry),
`object` (selection resolution), `query` (live `useQuery` feeding context), `operation` (the only
writer). `ref`, `view`, `feed` stayed design-only. Two additions it forced:

- **Published state** is a primitive of its own: `ui.<idPath>.<name>` slots declared by a scope's
  `let`, shaped by the named machine, written only by operations. It is deliberately _not_ in the database — it is
  per-session UI state — but it is shaped and addressed exactly as if it could be, which is what
  would make "persist this panel's layout state" a policy change rather than a redesign.
- **The draft** (tier-1 private state): a form's in-progress edit, an editor's cursor. The system
  deliberately does not see it; it surfaces at commit points as one operation. Q3's tentative-edit
  decision and the CM-editor case are the same mechanism at two scales.

## Layout

The template grammar (see [`README.md`](../README.md)): closed kind tags, four attribute families
(`aspect`, `data-`, `item-`, `on-`), no text content, no expressions. What the spike added to the
grammar:

- **Lexical scopes.** An element declaring `id` opens a named scope for its subtree; its `let`
  children declare slots published at `ui.<idPath>.<name>` (the chain of enclosing scope ids).
  Binding resolution is lexical — the first path segment resolves through enclosing scopes
  innermost-first. _Updated 2026-08-29:_ the spike's fall-through to a root state object is
  deleted; resolution is closed over declared names (`let`, root `var`, `use` alias) per the
  module proposal below. Publication requires the name; anonymous elements stay private.
- **Structural conditionality** (Solid-inspired): `show`/`fallback` renders one branch by the
  presence of a single `when` binding — replacing the earlier `absent="omit"` attribute — and
  `switch`/`match` picks a branch by strict equality against an `on` binding. No expressions; one
  resolved binding decides which children exist.
- **Layout selection is above the template.** The ViewSwitch story holds two templates and picks by
  published state — the layout _itself_ is a function of published state, and selection survives
  the swap because it lives in state, not in the tree. This is the seed of the composite-app story
  (below): a shell is a state-driven chooser over templates, recursively.

Not yet in the grammar, known gaps: parts (`R-10`), sub-discriminators (`R-9`), async binding
resolution (`R-2` — `show` covers the absent state, but nothing resolves a `ref`/`query`),
widths/sizing (the master list needed an inline flex-basis in the renderer — geometry belongs in
the template's aspect vocabulary, not in renderer code).

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

Tonight's machines are **named slots**: `{ key, initial }` in the registry, bound to a name by a
scope's `let`, seeded at the slot's publication path, written by scope-relative operations
(`scope.get`/`scope.set` resolve slot names lexically through the dispatching node's frames). The
full formalism — specified here, not yet executed:

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
- **Addressing**: `id=` opens a scope and `let` publishes a slot at `ui.<idPath>.<name>` —
  landed as **lexical scopes**: a template addresses only names its enclosing scopes declare
  (plus, since 2026-08-29, the root's `var` inputs and `use` aliases — never an ambient state
  object), and operations write only the slots in the dispatching node's scope chain. What remains open is the cross-plugin/app scope: a toolbar in one template observing
  another template's scope needs an app-level frame both resolve through (which then needs a
  collision rule), and instance-per-item state (a `let` inside a collection scope).
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
  key: string; // org.dxos.operation.tasks.save
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
  closing a plank is as reversible as renaming a task, because both are logged operations.
- **Dynamic plugins** = registry mutation at runtime. Because templates reference by URI, a newly
  arrived plugin's contributions are picked up by the next render; a missing reference is a visible
  error (`R-8`), not a blank region — which is the honest failure mode for "async dynamic loading
  of components".

Open questions, ranked: (1) published-state addressing across templates/plugins — **answered in
[Typed binding and modules](#typed-binding-and-modules-proposal)**: names are module exports,
addressed `<alias>.<name>` through an explicit `use`; (2) operation payload typing and capability
injection (what does a handler get besides `ui`/`db`?); (3) where derived context lives when it is
shared — **also there**: derived values are typed exports of the module that owns the inputs, not
an ambient context object; (4) the parts/sizing grammar gaps (`when=` landed as `show`); (5)
whether machine transition tables earn their keep over slots + operations (the spike says: not
yet).

## Typed binding and modules (proposal)

> **Status (2026-08-29): the recommendation below is IMPLEMENTED**, in the landing order it
> prescribes. Landed: (1) fall-through deleted + rung-1 `let initial=` (closed resolution is a
> parse-time check, `BindingResolutionError` + inline render errors cover the rest); (2) `var`
> signatures with registration/mount checking (`varDecls`/`checkVars`); (3) `use` + per-module
> export tables under the three-column module contract (`ModuleDef`: slots/state/operations/
> capabilities, `viewModules`, `createModuleReader`, `checkUses`), write ownership enforced in
> dispatch (a module operation's `scope.set` throws on a foreign slot; cross-module writes go
> through `invoke`), `let from=` binding module capabilities; (4) stories migrated —
> `deriveContext` is gone, its derivations are module state exports, and the tasks module holds
> ONE `selections: string[]` slot: the single-select `select` operation is a constrained writer
> of it (`[id]`, or `[]` on Esc-deselect), `select-many` snapshots the multi-select machine into
> it, and the singular listbox binds the derived `selectionId` export; (5) a mutual-module
> system test proves reciprocal
> reads, invoke-only cross-module writes, and ownership violations throwing. The flat
> `registry.operations` table remains as the anonymous-template (template-local) case, per "the
> base of the ladder". The proposal text below is preserved as written.

The flaw the stories expose: `selected`, `filtered`, `items` resolve by falling through
every lexical scope to an untyped root context object that story code assembles
(`deriveContext`). A typo — `data-items="organisation"` — resolves `undefined` silently, and the
collection renders empty as though the data were absent. Nothing is type-checked, because the
root context has no declared type anywhere the template can see. (`<let derive=…>` was considered
and dropped; it would have multiplied ambient names, not typed them.)

Direction: the app consists of **modules** (plugins, in today's Composer) that provide named
state — and other capabilities — with definite types. Any module that wants another module's
state binds to it **explicitly**. No magic variables: every name a binding uses is either
declared locally (`let`) or references another module's typed provision. Root-context
fall-through is deleted, not patched.

### Survey

How other declarative systems handle exactly this boundary — how a consumer names a provider's
state, and where the error surfaces when the name or type is wrong:

| System                                                                                                              | Provision                                                                        | Binding                                                                     | Error surface                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [Android DataBinding](https://developer.android.com/topic/libraries/data-binding/expressions)                       | `<data><variable name="user" type="com.example.User"/>` — typed template inputs  | `@{user.name}` expressions against declared variables                       | Build: the generated binding class fails javac on a bad path                                                             |
| [Angular strictTemplates](https://angular.dev/tools/cli/template-typecheck)                                         | Component class members (typed by TypeScript)                                    | Template expressions; `[input]="expr"`                                      | Build: the compiler emits a type-check block per template and reports every binding mismatch as a diagnostic             |
| [QML](https://doc.qt.io/qt-6/qtqml-syntax-objectattributes.html#required-properties)                                | Typed `property` declarations; `required property` demands a value               | Qualified `id.` access + imports; unqualified context properties deprecated | Instantiation error for an unset required property; `qmllint` statically                                                 |
| [SwiftUI Environment](https://developer.apple.com/documentation/swiftui/environmentkey)                             | `EnvironmentKey` with a mandatory `defaultValue`                                 | `@Environment(\.key)` — typed keyed read                                    | Compile for key/type; a missing provider silently yields the default (cautionary)                                        |
| [Terraform modules](https://developer.hashicorp.com/terraform/language/values/variables)                            | Module `variable` (typed, validated) and `output` blocks                         | `module.<name>.<output>` — explicit, qualified                              | `terraform validate` / plan — unknown output, missing required variable, type mismatch all fail before anything applies  |
| [XAML compiled bindings](https://learn.microsoft.com/en-us/dotnet/maui/fundamentals/data-binding/compiled-bindings) | Ambient `DataContext` (untyped) → `x:DataType` declares the context type         | `{Binding Path}`                                                            | Classic: silent runtime failure (trace output only). Compiled: build error; MAUI now warns by default on uncompiled ones |
| [XState v5 actors](https://stately.ai/docs/actors)                                                                  | `setup({ actors })` — typed actor logic, typed `input`                           | Typed `ActorRef` from invoke/spawn; events typed per actor                  | TypeScript compile; missing/mistyped `input` rejects at the spawn site                                                   |
| [ES modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)                                 | `export` — a static, per-module name table                                       | Static `import { name } from`; no ambient names                             | Link time: an import of a missing binding fails before any code evaluates                                                |
| Composer capabilities (`@dxos/app-framework › Capability`)                                                          | `Capability.make<T>()('org.dxos…')` — NSID-branded typed tags; module `provides` | Module `requires` tuple; `yield* tag` in the body                           | Compile (`EnsureProvides` completeness, `Requirements` channel) plus activation-time manager validation                  |

Three findings decide the design:

1. **Ambient context is a documented regret everywhere it shipped.** XAML's untyped `DataContext`
   fails silently at runtime; the platform's answer is `x:DataType` compiled bindings, now
   warn-by-default, with guidance to treat the warnings as errors. QML deprecated unqualified
   context-property lookup in favour of `required property`. Angular retrofitted
   `strictTemplates`. No surveyed system moved toward fall-through.
2. **The consumer declares; the composition site is checked.** Android's `<variable>`, Terraform's
   `variable`, QML's `required property`, an ES `import`, a Composer `requires` — in every case
   the consumer names what it needs with a type, and the error surfaces where provider meets
   consumer (build, plan, link, activation), never inside the consumer at runtime.
3. **Defaults mask wiring errors.** SwiftUI's mandatory `defaultValue` converts a missing provider
   into silent wrong behaviour; MAUI documents `x:DataType="x:Object"` as the anti-pattern that
   trades build errors for runtime silence. Inputs are required or explicitly optional — never
   defaulted. And for late-loading providers, ES link-time plus Composer's activation-time manager
   check is the model: static where authoring is typed, a validation pass as the authoritative
   backstop where it is not.

### The module ladder

The variants are not alternatives at the same altitude; they are rungs. Two observations from the
spike order them.

**The current stories are anonymous modules.** Every story template is self-contained: it
references no other module, so it needs no `use` and no `var` — everything it binds is declared
locally by a `let`. This retroactively explains why the spike works at all without A/B/C: once
fall-through is deleted, an anonymous module's scope is **closed by construction** — the set of
resolvable names is exactly the set of its own declarations, and the whole error table below
collapses to the parse/validate row. The stories' one violation of anonymity is the root context
(`items`, `filtered`, `selected`) — which is precisely where the flaw lives. The same
holds on the write side: an anonymous module's operations are local definitions — handlers
registered alongside the template, writing only its own `let` slots through `scope.set` — and
naming a module is what turns them into exports. An anonymous module is not a degenerate case to
grow out of; it is the base of the ladder, and most leaf templates should stay there.

**Intra-module wiring is already the long form of `useState`.** FilterList is the proof:

```xml
<let name="text" machine="org.dxos.machine.text" />
<control label="Filter" data-value="text" on-input="org.dxos.operation.filter.input" />
```

One slot, one component reading it (`data-value`) and one operation writing it (`on-input` →
`scope.set({ text })`) — a declarative `const [text, setText] = useState('')` where the tuple's
two halves are two attributes against the same `let`. The pair is the canonical controlled-binding
shape, but today only convention couples them: the grammar sees an operation key, not the slot the
handler writes, so nothing checks that `on-input`'s handler actually targets `text`. Whether the
pair earns a checked form — a `bind-value="text"` sugar expanding to the read binding plus a
dispatch of the slot's machine's default write event, keeping `R-3` (the write is still an
operation, just a derived one) — is an open question below.

The ladder, then — one declaration form, `let`, whose **backing escalates in place** while the
binding surface (the name, the `data-`/`on-` attributes against it) stays fixed:

| Rung | Declaration                                     | Analogue                 | Behaviour             | Sharing              |
| ---- | ----------------------------------------------- | ------------------------ | --------------------- | -------------------- |
| 1    | `<let name="text" initial="" />`                | `useState`               | none — a value        | private to the scope |
| 2    | `<let name="selection" machine="…selection" />` | `useReducer` / actor     | transitions, guards   | private instance     |
| 3    | `<let name="selection" from="tasks.…" />`       | context / external store | the module instance's | shared, module-owned |

Rung 1 is a grammar relaxation — today's `let` demands a `machine=` and starts life on rung 2;
a plain initial value is the honest floor. Upgrading a rung is a one-attribute edit: when
selection outgrows "a value" (guards, multi-select semantics), `initial=` becomes `machine=`;
when another template needs to observe it, `machine=` becomes `from=` and the instance moves to
the owning module's capabilities column. **No binding in the subtree changes at any step** — that
is what "same slot, same binding surface, added behaviour" buys, and it is the property React
loses at the same transitions (`useState` → `useReducer` → context is three refactors).

The rungs are also a column selector against the module contract (below): rung 1 backs a `let`
with a plain value, rung 2 with a locally-instantiated machine, rung 3 with a module-provided
capability. Reading another module's state needs no `let` at all — a `data-` path through the
`use` alias binds the state column directly.

The variants sit on the same ladder one level up, at the module boundary: **A is the rung where a
module stops being anonymous** — the moment a template needs a name it does not declare, it must
say so in its signature (`var`) rather than reaching into ambient context; **B and C are the
named-module rungs** — providers publish typed export tables (B) whose writable rows are machine
instances (C), and consumers climb from `var` (host wires it) to `use` (the template names its
provider).

### Variant A — typed template signature

The template root declares its inputs, Android-`<variable>` style. `var` is a new closed tag,
valid only as a direct child of the root; its `type` is a registry schema key, with cardinality
and optionality from the ontology's §3 columns.

```xml
<layout id="tasks" rows="1fr 1fr">
  <var name="tasks" type="org.dxos.type.Task" many="true" />
  <var name="selected" type="org.dxos.view.TaskForm" optional="true" />
  <let name="selection" machine="org.dxos.machine.selection" />
  <let name="draft" machine="org.dxos.machine.flag" />
  <collection data-items="tasks" item-id="id" item-label="title"
              data-selection="selection"
              on-select="org.dxos.operation.tasks.select" />
  <show when="selected">
    <form schema="org.dxos.type.Task" data-values="selected"
          on-save="org.dxos.operation.tasks.save"
          on-cancel="org.dxos.operation.tasks.cancel" />
    <fallback>
      <display label="Nothing selected." />
    </fallback>
  </show>
</layout>
```

- **Types**: registry schemas (`type=` keys resolve exactly as `schema=` does today); `let` slots
  keep their machine's `stateSchema`. With TSX authoring, `select<Signature>()` checks the same
  names at compile time — the signature is the `State` parameter `R-1` always demanded.
- **Resolution (closed)**: a binding's first segment must be a `let` in an enclosing scope or a
  root `var`. Anything else is an error. `deriveContext`'s output becomes the value the host
  supplies against the signature.
- **Errors**: undeclared name → **parse/validate** (both declaration and use are in the
  document); unknown `type=` key → **registration**; host context failing the signature
  (`Schema.decodeUnknown` over the declared `var`s) → **mount**; nothing left for runtime except
  legitimately-absent async values, which `show` already covers (`R-2`).
- **Migration**: add `var` to `TAGS` + `validate`; delete the fall-through branch in `resolve`
  (the story change is mechanical — each story template declares the two or three names it uses).

### Variant B — module import/export

A module publishes a **typed export table** in the registry — name → data primitive (ontology §3)
plus schema — and a template names the module it consumes, Terraform/ES-module style:

```xml
<container id="picker">
  <use module="org.dxos.plugin.tasks" as="tasks" />
  <let name="filter" machine="org.dxos.machine.text" />
  <display variant="title" data-text="tasks.title" />
  <combobox placeholder="Select task…"
            data-items="tasks.filtered" item-id="id" item-label="title"
            data-value="tasks.pickerLabel" data-filter="filter"
            on-input="org.dxos.operation.picker.input"
            on-select="org.dxos.operation.picker.select" />
  <show when="tasks.selected">
    <form schema="org.dxos.type.Task" data-values="tasks.selected" />
  </show>
</container>
```

```ts
// The provider side: what deriveContext becomes — a module's typed export table.
const TasksModule = {
  key: 'org.dxos.plugin.tasks',
  exports: {
    items: { primitive: 'query', schema: Task },
    filtered: { primitive: 'query', schema: Task }, // derived — still typed, still owned here
    selected: { primitive: 'view', schema: TaskForm, optional: true },
    pickerLabel: { primitive: 'object', schema: Schema.String },
  },
};
```

- **Types**: the export table is the authority; derived values (`filtered`, `selected`) are typed
  exports of the module that owns the inputs — shared derived context (open question 3) stops
  being an ambient story function.
- **Resolution (closed)**: first segment is a `let` name or a `use` alias; the second segment
  must be in that module's export table. No alias, no binding.
- **Errors**: unresolvable first segment or dangling alias → **parse/validate**; unknown export
  name or primitive/kind mismatch → **registration** when the module is present, **mount** when
  it loads late — surfaced as an inline error per `R-8`, exactly as an unknown `schema=` key
  renders today; never silence.
- **Migration**: `use` joins `TAGS`; the registry grows `modules: Record<key, ExportTable>`;
  each story registers one story-local module whose exports are today's `deriveContext` fields.

### Variant C — module-provided machine instances

State machines are **capabilities provided by modules**. A module declares a machine
**instance** — named, schema-described state (and eventually behaviour), not a def the template
instantiates — and every component that binds that name observes the same instance. In
master-detail, the collection and the form are two binders of one module-owned `selection`
instance; the template's `let` references the instance, it does not create one. This is the
Composer capability model (`Capability.make<T>()` — a typed token, one contributed
implementation, many consumers) and the XState v5 actor model (one spawned actor, typed
`ActorRef`s held by many observers) applied to UI state:

```xml
<layout id="tasks" rows="1fr 1fr">
  <use module="org.dxos.plugin.tasks" as="tasks" />
  <let name="selection" from="tasks.selection" />
  <collection data-items="tasks.items" item-id="id" item-label="title"
              data-selection="selection"
              on-select="org.dxos.operation.tasks.select" />
  <show when="tasks.selected">
    <form schema="org.dxos.type.Task" data-values="tasks.selected"
          on-save="org.dxos.operation.tasks.save"
          on-cancel="org.dxos.operation.tasks.cancel" />
    <fallback>
      <display label="Nothing selected." />
    </fallback>
  </show>
</layout>
```

```ts
// The provider side: the module contract's three columns (see "The module contract" below) —
// in Composer terms, rows in its `provides`.
const TasksModule = {
  key: 'org.dxos.plugin.tasks',
  // 1. Reactive readonly state — consumers read and subscribe, never write.
  state: {
    items: { primitive: 'query', schema: Task },
    // Derived from selection × items — typed, owned by the module that owns the inputs.
    selected: { primitive: 'view', schema: TaskForm, optional: true },
  },
  // 2. Operations — one-shot typed writes; the ONLY writers of the state above.
  operations: {
    select: { key: 'org.dxos.operation.tasks.select', input: Schema.String },
    save: { key: 'org.dxos.operation.tasks.save', input: TaskForm },
    done: { key: 'org.dxos.operation.tasks.done' },
  },
  // 3. Capabilities — typed APIs over the state; the machine instance is the exemplar.
  capabilities: {
    selection: Machine.instance(SelectionMachine),
  },
};
```

- **Types**: the machine's `stateSchema` is declared once, at the instance the module provides;
  every binder — this template's collection and form, another plugin's toolbar — gets the same
  type by construction, the way every `yield*` of one capability tag does.
- **Resolution (closed)**: `let from=` binds a local name to a module export that must be a
  capability (a machine instance); plain `data-` paths reach read exports through the `use` alias. A `let
machine=` (today's form) remains for template-private state — the combobox's `filter` has no
  business being a module export — so the private/shared line is drawn in the grammar, not by
  publication-path convention.
- **Writes**: a consumer of `tasks.selection` never sets it — it dispatches tasks' own
  operations (`on-select="org.dxos.operation.tasks.select"`), exactly as the master-detail
  template already does, and a toolbar in another plugin marks the selection done the same way.
  Observation is shared; mutation stays with the owner.
- **Errors**: dangling `from=` alias or non-capability target → **registration** (mount for a
  late-loading module, with `waitFor` + absent state per `R-2`); writes remain scope-relative
  operations dispatched to the instance, so `R-3` and the single operation log hold — undo sees
  cross-component transitions for free.
- **Migration**: registry machines gain identity (module-scoped instance, not def-per-scope);
  `seedUi` seeds only `let machine=` slots; `ui.<idPath>.<name>` publication becomes the private
  case, while shared state is addressed by module + export name — which dissolves the
  namespace-collision half of open question 1.

### The module contract

The canonical definition, superseding any two-sided framing above: **a module provides exactly
three things.**

1. **Reactive readonly state** — typed values and derived views a consumer can read and
   subscribe to, never write.
2. **Operations** — one-shot, typed invocations that may mutate **their own module's state
   only**; the sole write path from outside.
3. **Capabilities** — typed APIs for manipulating the state; the machine instance is the
   exemplar: a behavioural surface (transitions, guards, subscription) over the module's state,
   richer than a one-shot operation.

Reads bind to (1); writes dispatch (2); stateful, ongoing interaction goes through (3). The
export table has these three columns — state, operations, capabilities — and nothing else, with
each operation carrying a typed input schema (folding open question 5 into the same table).
Another module reaches foreign state by dispatching the owning module's operations or driving
its capabilities — never by writing slots directly.

This is not a new rule so much as the existing one said out loud. `scope.set` already refuses an
undeclared name — a handler can only write slots in the dispatching node's scope chain — and the
module boundary is that closure promoted one level: the scope chain of a module's operations ends
at the module, not at an app-global frame. `R-3` ("only `operation` writes") gains an owner
clause: only the _owning module's_ operation writes. The payoff is the same one ES modules and
Composer capabilities get from explicit boundaries — a module's state transitions are enumerable
from its own operation table, so "what can change `tasks.selection`?" has a static answer, and
the operation log partitions by module for free.

The spike's single global operation registry (`registry.operations`, flat
`org.dxos.operation.*` keys) is then a **temporary flattening** of per-module tables: the keys
already carry the module segment (`tasks.select`, `picker.input`), so unflattening is
attribution, not renaming. What changes is enforcement — dispatch resolves the key through the
owning module's table, and the handler's `scope` is the module's own slots rather than the
dispatching template's frames.

### Capability sync (zag)

Implemented (`CapabilityDef.create`, `mountCapabilities`, the `MasterDetailMulti` story): a
capability may carry a live machine instance — the Zag multi-select from
`src/testing/Example.ts` is the exemplar. The host mounts **one shared instance per module
capability** when the system mounts (never per render), handing the factory a single `invoke`.
The sync pattern is one-directional by construction:

- **Write path (only one)**: machine transition → bindable `onChange` → `invoke` dispatches the
  owning module's operation (`tasks.select-many { ids }`) → its handler `scope.set`s the
  capability's slot (`selections`). Every transition is therefore a logged operation, and the
  published-state pane shows the snapshot — MVU holds with the machine as an implementation
  detail behind the slot.
- **Read path**: binders read the slot (`data-selections="tasks.selections"`), never the
  machine. The mounted api (`ModuleView.apis`, reached by the component's
  `capability="alias.name"` aspect) exposes **event senders only** — its snapshot getters go
  stale by design.

The probe's conclusion stands confirmed: the machine's bindable context is a second state
store, and `onChange` snapshotting through an operation is the sync seam that keeps it
subordinate to published state. Cost observed: the snapshot in the slot and the context in the
machine are the same data twice, reconciled only by the onChange discipline — a machine that
mutated context outside an action would desync silently.

### Recommendation

**Adopt the module contract and the ladder whole: one declaration form, `let`, whose backing
escalates — value → machine → imported capability — under a closed resolution rule.** C is the
provision model at the top rung: modules provide the contract's triad — readonly state,
operations, capabilities — and templates bind local names to it explicitly; nothing is ambient.
The columns partition the binding surface: `data-` paths read column 1, `on-` dispatches column
2, `let from=` binds column 3 — and only a module's own operations write its state. B is the
addressing — the export table is _how a module declares_ the triad, `use`/`let from=` is _how a
template names_ it — so B and C land together. A is the boundary rung between them and
anonymity: a template that needs a name it does not declare says so in its `var` signature, and
the composition site satisfies it by wiring module exports — Android's `<variable>` on one side,
Terraform's module wiring on the other.

The landing order follows the rungs, cheapest first: (1) delete fall-through and admit rung-1
`let initial=` — the stories become anonymous modules, closed by construction; (2) A's `var`,
which makes the remaining root-context names explicit and mount-checked while the registry work
proceeds; (3) B/C's `use` + three-column export tables under the module contract. Each step is independently
shippable, and no step rewrites a binding the previous step introduced — the same in-place
upgrade property the ladder gives a single `let`.

Error classes, consolidated (the never-runtime column is the point):

| Error                                       | A              | B + C                        | Caught     |
| ------------------------------------------- | -------------- | ---------------------------- | ---------- |
| Binding names an undeclared first segment   | parse/validate | parse/validate               | always     |
| Unknown schema / machine / module key       | registration   | registration (mount if late) | per `R-8`  |
| Unknown export on a known module            | —              | registration / mount         | inline     |
| `let from=` targets a non-capability export | —              | registration                 | inline     |
| Host context does not satisfy the signature | mount          | mount (wiring check)         | once       |
| Typo resolving `undefined` at render        | impossible     | impossible                   | —          |
| Legitimately absent async value             | `show` (`R-2`) | `show` (`R-2`)               | structural |

### Open questions

1. **Export-table derivation**: is a module's export table authored, or derived from its
   contributed capabilities (the Composer `provides` tuple already carries the types)? Deriving
   avoids a second declaration; authoring keeps the table smaller than the capability surface.
2. **Versioning the boundary**: Terraform treats a changed output as a breaking change
   surfaced at plan; what is the equivalent when a plugin update removes an export a mounted
   template uses — mount error on next render, or a deprecation window in the registry?
3. **`item-*` typing**: `many` exports give the collection's element type; threading it into
   `item-*` validation needs the ontology's cardinality column to become part of the export
   table's contract.
4. **Instance lifecycle and cardinality**: a module-provided machine instance is app-scoped by
   default, but master-detail per plank wants instance-per-context (the XState answer is spawn
   with typed input; the Composer answer would be a keyed multi capability). Which contexts get
   their own instance, and who tears it down?
5. ~~**Operation payloads** are the same boundary in the write direction~~ — answered by
   [the module contract](#the-module-contract): operations are the contract's second column,
   with a typed input schema per key. What remains open from question 2 is
   capability injection (what a handler is given besides `ui`/`db`).
6. **The controlled pair**: should `data-value` + `on-*` against one slot get a checked form —
   `bind-value="text"` expanding to the read binding plus a dispatch of the slot's default write
   event (`R-3` preserved; the write target becomes visible to validation) — or stay two
   attributes coupled by convention, with the ladder's rung-1 `let` making the convention cheap
   enough to tolerate?

## Verification (2026-08-29)

All in `System.stories.tsx`, one `DefaultStory`, per-story layout/context; `EchoTestBuilder`
database (the full client harness wedged the dev server on space boot and is not needed):

| Story               | Verified in browser                                                              |
| ------------------- | -------------------------------------------------------------------------------- |
| List                | 6 rows from a live query                                                         |
| Form                | projection schema renders; no readonly `id` field                                |
| MasterDetail        | click → `select` op → published state → form; save → `Obj.update` → query → list |
| MasterDetailToolbar | Add → draft → save → `db.add` (new row); Done writes the selection               |
| Combobox            | typing dispatches `picker.input`; items narrow from state; pick fills the form   |
| FilterList          | `filter.text` state narrows the list                                             |
| ViewSwitch          | `view.mode` swaps the whole layout; selection survives the swap                  |

Known defects, deliberate: the uncontrolled form does not refresh when an external write lands on
the selected object (draft snapshot isolation — needs a merge policy); machine slots reset when the
template is edited (re-seed on parse); the operation log caps at 20 entries.
