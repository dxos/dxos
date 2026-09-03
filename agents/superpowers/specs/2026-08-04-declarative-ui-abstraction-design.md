# Declarative UI Abstraction — Design Exploration

- **Date:** 2026-08-04
- **Status:** Exploration; Experiment 1 implemented and verified (see Results),
  then **parked** — the direction is reframed around authored composition in
  `2026-08-06-scenes-app-ontology-design.md` (Scenes). The survey, prior art,
  and Experiment 1's bridge findings remain the substrate for that design.
  The experiment's code was removed from this branch when `main`'s
  atom-substrate migration (`effect/unstable/reactivity/Atom`) made the parked
  implementation stale; it remains reachable at commits `49de0924`/`a5e7982a`
  (PR #12484 history).
- **Scope:** `react-ui-form` / `react-ui-card` / `react-ui-list` / `react-ui-mosaic`,
  plugin containers, the Surface system, and the effect-atom substrate.

## Problem

Plugin containers today are the least uniform layer of the stack. The primitives
below them are well-factored and increasingly declarative, but every composite
container (a list + form + toolbar, say) is hand-written imperative React:
hooks for queries, memoized derivations, a callback switchboard, and
conditional-brace layout logic — all tangled in one component.

The canonical pain case is `plugin-inbox`'s `MailboxArticle`
(`containers/MailboxArticle/MailboxArticle.tsx`, ~670 lines): ~15 hooks up
front (`useOperationInvoker`, `useAtomCapability`, `useSelection`,
`useResolveRef`, a per-message atom family, debounced filter text →
`QueryBuilder` → `usePagination`), one big `handleAction` switch, a
`MenuBuilder` menu, and a render body of conditional chrome. None of this is
wrong — but none of it is _declared_, so it cannot be inspected, generated,
reused across renderers, or kept uniform across plugins except by convention.

We want to explore a further unification: entire containers defined by a
JSX-like template, driven by data binding and action handlers, with logic
factored into non-React reactive state (atoms) — and to weigh that against
alternatives. Goals, in priority order as stated:

1. **Layout-engine independence** — eventually switching away from React.
2. **Performance** — fine-grained invalidation, virtualization preserved.
3. **Clarity / quality** — separation of layout from logic.
4. **Uniformity / consistency** — one recipe across plugins.
5. **On-the-fly generation** — an agent (or user) can produce UI at runtime.

## Where we already are

The important observation from the survey: **most of the abstraction already
exists — it just stops one layer below containers.**

### The reactive substrate is already renderer-neutral

- `@effect-atom/atom` is the repo-wide state currency (85+ packages). ECHO
  objects expose atom families (`Obj.atom`, `Obj.atomProperty`,
  `Obj.labelAtom`, `Ref#atom`, `QueryResult.atom` —
  `packages/core/echo/echo/src/internal/Obj/atoms.ts`); the capability system
  (`capability-manager.ts`), the app graph (`app-graph/src/graph.ts`), menu
  models (`react-ui-menu/src/builder.ts` + `useMenuActions(atom)`), and Surface
  resolution (`SurfaceManager.ts`) are all atom computations. React is only the
  last-mile `useAtomValue`.
- Alternate bindings already exist: `@dxos/effect-atom-solid`, `echo-solid`,
  `solid-ui`, `app-solid`, plus Lit web components (`@dxos/lit-ui`:
  `dx-icon`, `dx-avatar`, `dx-anchor`, `dx-tag-picker`) and
  `Surface.createWeb` (tag-name-based web-component surfaces). The
  cross-framework seam is the atom layer, and it is already load-bearing.

### The primitives are already controlled and increasingly data-driven

- **Forms** (`react-ui-form`): a genuine schema-driven layout engine.
  `Form.FieldSet` recursively walks the effect `SchemaAST` (nested objects,
  arrays, discriminated unions, refs); adapters resolve in a fixed order —
  `fieldMap` (by JSON path) → `fieldProvider` (callback) → annotation-driven
  dynamic fields (`OptionsLookupAnnotation`, `AutofillAnnotation`) → built-in
  scalar registry by `Format`/AST tag. The root is controlled
  (`values`/`onValuesChanged`/`onSave`, sparse per-JsonPath overrides). And —
  crucially — there is already a **template DSL**: `FormLayoutAnnotation`
  carries named XML-ish templates (`<grid cols="2"><field name="x"
span="2"/></grid>`, parser in `FormLayout/parser.ts`) that override linear
  rendering. This is the embryo of the container-template idea, shipped and in
  use (`compute/types/Project.ts`, `plugin-magazine`, `plugin-library`).
- **Lists** (`react-ui-list`): compounds over shared aspect hooks
  (`useListSelection`, `useListNavigation`, …) with controlled roots
  (`value`/`onValueChange`, `expandedId`, `onMove`) — see the aspects design
  (`2026-06-13-react-ui-list-aspects-design.md`).
- **Mosaic** (`react-ui-mosaic`): binding is already fully declarative —
  `Mosaic.Stack`/`VirtualStack` take `items + getId + Tile`; the container root
  owns `currentId`/`selectedIds` + `onCurrentChange`/`onSelectionChange`; DnD
  is a protocol (`DndContainerHandler` in `react-ui-dnd`).
- **Cards**: the outlier. `Card.*` (in `react-ui`) plus `react-ui-card`'s
  shared fragments (`CardTile`, `Row.Date/Ref/Person/Tags/…`) give a good part
  _vocabulary_, but every card is hand-composed JSX per type. The
  semi-automated pattern in `plugin-inbox` is projection-by-helper:
  `getMessageProps(message)` → a ~25-line JSX card → registered on the
  `AppSurface.CardContent` role. The only schema-driven card is
  `plugin-preview`'s fallback `FormCard` (Form in `static` presentation).

### The action seam is already converging

`InboxStack` funnels every interaction into a single discriminated-union
callback `onAction: (action: InboxStackAction) => void`; container code routes
arms to **Operations** (`invokePromise(TaskOperation.CreateTask, …)`). That is
Elm's `update(msg)` in all but name, with Operations as the typed, serializable
command layer. An agent already drives UI through a declarative channel:
`plugin-assistant`'s `SurfaceWidget` parses `<surface role="…">{json}</surface>`
content blocks into `<Surface>` dispatches via an `XmlWidgetRegistry`.

**The gap, precisely:** the middle layer — per-container composition of query
atoms, derived state, action routing, and layout — is hand-written React. That
layer is what a declarative abstraction should capture.

## Prior art

| System                                             | Lesson for us                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Jetpack Compose** (runtime/UI split)             | The composition runtime (`compose-runtime`) is renderer-agnostic; Android UI is one client. Proof that "declarative tree + state model" can be decoupled from the layout engine — but the tree lives in compiled code, so it is not serializable/generative.                                                                                                  |
| **SwiftUI**                                        | Value-typed view descriptions re-derived from state; identity + diffing owned by the runtime. Same non-serializable caveat; `@Observable` fine-grained tracking parallels atoms.                                                                                                                                                                              |
| **SolidJS**                                        | Control flow as components (`<Show>`, `<For>`, `<Switch>/<Match>`) with fine-grained signals and no VDOM diffing. Directly answers "replace conditional braces with IF components" — and the pattern works as an _interpretation strategy_, not just a framework: `<For>` over an atom of items maps to keyed child materialization.                          |
| **Elm / MVU**                                      | `Model → view`, `Msg → update`. The discriminated-union `onAction` + Operations is MVU already; naming it makes containers testable headless.                                                                                                                                                                                                                 |
| **QML**                                            | Declarative markup + property bindings + signal handlers, logic in controllers; the closest end-state to the brief ("template + data binding + action handlers"). Shows the cost too: a binding language needs scoping/typing rules.                                                                                                                          |
| **XAML / WPF**                                     | `DataTemplate` + `DataTemplateSelector` = type-directed template resolution — which is exactly what Surface roles do (`AppSurface.object(CardContent, Message.Message)`). `ICommand` = Operations. MVVM = the "intermediate controller objects" the brief asks about; its failure mode (boilerplate ViewModels mirroring models) is what atom families avoid. |
| **Server-driven UI** (Airbnb Ghost, Lyft, Shopify) | JSON component trees interpreted by a client registry; versioned schema; unknown-node fallback. The proven architecture for _generated_ UI — and its discipline (small closed node set + registered escape hatches) is the right guard-rail.                                                                                                                  |
| **Adaptive Cards**                                 | A serializable, schema-validated card DSL with host-controlled styling and a template/data-binding language. Precedent for card unification specifically.                                                                                                                                                                                                     |
| **JSON Forms / RJSF `uiSchema`**                   | Schema (data) + uiSchema (layout) separation — `FormLayoutAnnotation` is already this, per-type and named-variant.                                                                                                                                                                                                                                            |
| **XState / statecharts**                           | Where controller logic outgrows `update(msg)` switches, statecharts keep it declarative and inspectable. Optional, per-container.                                                                                                                                                                                                                             |
| **react-three-fiber / Ink**                        | Custom reconcilers re-target JSX to non-DOM hosts. A cheaper "leave React later" hedge — but it keeps the React runtime, so it serves portability of _authoring_, not independence of _runtime_.                                                                                                                                                              |
| **ImGui (immediate mode)**                         | The opposite pole: no retained tree, everything re-derived per frame. Attractive for generation, wrong for accessibility/focus/virtualization; noted to bound the space.                                                                                                                                                                                      |

Two syntheses from this table:

1. Every successful "generate UI at runtime" system is **data-interpreted**
   (SDUI, Adaptive Cards, QML), while every successful "maximum ergonomics for
   engineers" system is **code-compiled** (Compose, SwiftUI, Solid). Systems
   that need both (Airbnb) run a _closed data model interpreted by
   code-authored components_. We should not pick one — we should put the
   boundary in the right place.
2. Everyone ends up with the same three-part split: **state/bindings**
   (signals/atoms/observables), **messages/commands** (Msg, ICommand,
   Operations), and a **template layer** (data or code) resolved by a
   **type-directed registry** (DataTemplateSelector, SDUI registry, Surface).
   We already have three of the four; the template layer is the missing part.

## Design space

Three axes structure the options:

- **Template representation.** (a) TSX components (status quo, compiled,
  maximally expressive, not serializable); (b) a serializable data model
  (inspectable, generable, renderer-neutral, bounded expressiveness); (c)
  isomorphic — TSX-looking authoring that _emits_ the data model (JSX factory
  or typed builder), so hand-written and generated templates converge on one
  runtime path.
- **Binding model.** Props-drilling explodes on composites (the brief's
  concern). The alternative currency is **atom references**: a template node
  binds to `state.<name>` where the controller publishes named atoms; item
  scopes (inside a `For`) bind to per-item atom families (the
  `useMessageTagsAtomFamily` pattern, generalized). Actions are not callbacks
  but **messages**: `{ action: 'star', subject: $item }` routed through one
  dispatcher to Operations.
- **Where logic lives.** The "intermediate controller object" the brief
  hypothesizes should be an **Effect-service-shaped controller**: a constructor
  `(ctx: { db, settings, … }) => { state: Record<string, Atom>, dispatch:
(msg) => Effect }`. (Sketch. The implemented contract is `dispatch: (msg) =>
void` — see §Experiment 1 — because every arm terminates in an Operation
  invocation whose failure is reported through the operation layer, so there is
  no residual Effect for the template to run.) No React. Testable headless (vitest + registry), reusable
  from Solid/Lit, and exactly what the existing menu (`MenuBuilder` → atom) and
  board (`Board.Root model=`) APIs already do in miniature.

## Options

### Option A — Controller extraction + declarative control flow (no new runtime)

Keep TSX. Introduce two conventions and a tiny library:

1. **`ViewController`** — per-container controller objects built from atoms +
   an MVU dispatch, constructed outside React (Effect layer), consumed via one
   hook (`useController(MailboxController, props)`). All queries, derived
   state, debounce, and action routing move out of the component.
2. **Control-flow components** — Solid-style `<If test={atom}>`,
   `<Match>/<Case>`, `<For each={atomOfItems}>` in a small package
   (`react-ui-flow` or additions to `react-ui-components`), reading atoms
   directly so branches re-render on fine-grained change without parent
   re-render.

The container becomes a pure template _in TSX_: composite roots + control-flow
components + bindings to `controller.state.*` and `controller.dispatch`.

- **Pros:** immediate clarity win; no interpreter; incremental per-container
  migration; performance improves (atom-scoped subscriptions replace
  component-scoped hooks); the controller is the renderer-independence seam.
- **Cons:** templates are still compiled code — no runtime generation, no
  serialization, uniformity still by convention; React remains the layout
  engine for everything written this way.

### Option B — A serializable container template model ("Surface templates")

Generalize what `FormLayout` already proves at form scale to container scale.
Define a **closed, schema-validated node model** (Effect Schema union — so
templates are ECHO-storable objects), roughly:

```text
TemplateNode =
  | Layout:    panel | toolbar | section | grid | row        (chrome/geometry)
  | Composite: list | stack | form | card | menu | tabs      (bind to composite roots)
  | Content:   text | label | icon | image | value           (leaf bindings)
  | Flow:      if | match | for                              (control structure)
  | Escape:    surface (role + data) | component (registry key)
Binding  = { path: JsonPath } | { state: string }            (controller atom by name)
ActionRef = { action: string, args?: Record<string, Binding> } (→ dispatch → Operations)
```

An **interpreter** (per renderer) walks the tree: React first (each node type
maps to the existing composites — `Panel`, `Mosaic.VirtualStack`, `Form.Root`,
`Card.*`), Solid/Lit later against the same node model. Templates are resolved
type-directedly, exactly like surfaces: a template is _contributed_ for
`(role, schema)` the way `Surface.create({ filter, component })` is today —
hand-written components and templates coexist behind the same resolution,
so migration is per-surface and reversible.

Custom behavior has two sanctioned escape hatches, mirroring `fieldMap` /
`fieldProvider` in forms: the `component` node (registry-keyed custom React/
Solid component receiving bound props) and the `surface` node (delegate a
subtree to normal Surface resolution). Extension = register a component or
extend the node union — never fork the interpreter.

- **Pros:** delivers generation (assistant emits a template object — the
  `SurfaceWidget` pipeline already parses agent-emitted trees), uniformity
  (one interpreter, one recipe), inspectability (templates are data; a
  template editor is a form over the template schema), and true layout-engine
  independence (the node model + controller contract is the portable artifact;
  a renderer is "interpreter + primitive kit", and lit-ui/solid packages seed
  the kit).
- **Cons:** an interpreter to build and maintain; a binding/scoping language to
  specify (the QML tax — keep bindings to path/state references, no
  expressions, to stay out of the expression-language trap); bounded
  expressiveness by design; virtualization and DnD must flow through the
  composite nodes' existing props, not be reinvented per template.

### Option C — Framework-agnostic retained UI runtime

A compose-runtime-style layer: our own component/composition model over atoms,
with React demoted to one backend (or dropped for a direct DOM/Lit backend).

- **Pros:** maximal independence and performance ceiling (fine-grained direct
  DOM updates, no VDOM).
- **Cons:** we would own a UI runtime — scheduling, identity, focus,
  accessibility, event systems, devtools. This is a company-scale investment
  (Compose has a dedicated team) and duplicates what Solid/Lit already are.
  If the day comes to leave React, **adopting** Solid/Lit behind the Option B
  seam is strictly cheaper than building a runtime. Rejected as a project;
  kept as the horizon that Options A+B must not foreclose.

## Recommendation

**A then B, as one program; C never as a build, only as a constraint.**

They are not competitors: A's controller is B's binding target. The sequence
matters because the controller extraction is pure win with zero speculative
machinery, and it hardens the exact contract (`state` atoms + `dispatch`
messages) that makes templates possible at all. Concretely:

1. **Name the controller pattern.** Extract `MailboxArticle` (and one simple
   container, e.g. `TaskSetArticle`) into `ViewController`s: atoms for query/
   filter/selection state, one `dispatch` routing the existing
   `InboxStackAction` union to Operations. Ship the `useController` hook and
   headless controller tests. _Exit criterion: the container component contains
   zero `useCallback`/`useMemo` and no branching beyond template flow._
2. **Ship control-flow components** (`If`/`Match`/`For` over atoms) and use
   them in the extracted containers. This is the Solid idiom inside React and
   doubles as the interpreter's flow semantics later.
3. **Unify cards as the first template domain.** Cards are the smallest, most
   repetitive, least stateful container family — and `FormLayoutAnnotation` +
   `AdaptiveCards` show the shape. A `CardLayoutAnnotation` (named templates
   over a projection: rows of `Row.Date/Person/Tags/…` parts bound by path)
   replaces hand-rolled cards per type; `FormCard` remains the fallback;
   hand-written cards remain a registered override. This retires the
   `getMessageProps` + bespoke-JSX pattern where it is not earning its keep.
4. **Generalize the template model to containers** (Option B proper): promote
   the `FormLayout` parser idea from string-DSL-in-annotation to typed
   `TemplateNode` objects (Effect Schema, ECHO-storable), write the React
   interpreter over the existing composites, and register templates through
   Surface resolution alongside components.
5. **Generation + portability last, on proven rails.** Assistant emits
   `TemplateNode` trees through the existing `<surface>` widget channel
   (validated by the template schema — malformed output fails closed to the
   fallback card/form). A Solid interpreter spike over `effect-atom-solid` +
   `solid-ui` validates the independence claim on one real surface.

Why this ordering wins against the goals: independence is achieved by
_shrinking the React-specific surface to interpreter + primitives_ rather than
by rewriting; performance comes from atoms doing invalidation below the
component level (and is preserved by binding templates to the existing
virtualized composites rather than replacing them); clarity comes at step 1
without waiting for the runtime; uniformity and generation come from the
template layer being data resolved through the machinery (Surface) plugins
already use.

## Risks and mitigations

- **Expression-language creep** in bindings (the QML/Angular-template trap).
  Mitigate: bindings are references only (`path` | `state`); any computation
  belongs in the controller as a derived atom.
- **Two ways to build a container** during migration. Mitigate: templates and
  components share Surface resolution, so each surface is one or the other;
  track migration per role.
- **Interpreter performance.** Mitigate: node → element materialization is
  memoized per node identity; leaf re-rendering is atom-scoped; lists always
  lower to `Mosaic.VirtualStack`. Budget: interpretation must be O(visible
  nodes), never O(items).
- **Prop explosion re-appears as binding explosion.** Mitigate: the controller
  publishes a _named_ state record (a scope), not positional props; templates
  reference names; `For` introduces nested scopes — this is the MVVM
  DataContext lesson.
- **Typing serialized templates.** Effect Schema gives structural validation;
  path bindings can be checked against the bound schema at contribution time
  (the `resolveLayoutField` precedent already does dotted-path resolution).

## Experiment 1 — `MailboxController`: split `MailboxArticle` into controller + template

A time-boxed (2–4 day) probe of the Option A claim, on the hardest real
container: `plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx`
(~670 lines). The output is knowledge, not a merge: does _everything_ non-JSX
move out of React, what bridge points remain, and what does it cost/buy?

### Why this container is the right subject

It contains every pathology the abstraction targets — ~15 hooks, a derived
query pipeline (filter text → debounce → `QueryBuilder` → scopes →
aggregate → pagination → post-filters), an action switchboard
(`InboxStackAction`), an atom family per tile, a `MenuBuilder` menu, DOM refs,
and conditional chrome — and two facts make it cheaper than it looks:

- **The pagination store is already framework-free.** `createPaginationStore`
  (`echo-react/src/usePagination.ts`) is a plain external store
  (`subscribe`/`getSnapshot`); `usePagination` is just the
  `useSyncExternalStore` wrapper. Wrapping it in an atom is mechanical.
- **Half the file is already atoms or pure functions.** `sortDescending` is an
  `AtomState`; `tagsAtom`/`starredAtom`/`systemTagIds` are atom families over
  `TagIndex`; `applyPostFilters`/`reconcileDrafts`/`isThreadGroup` are pure
  module-scope functions; the menu is already authored as an atom computation
  (`useMenuBuilder((get) => …)`). The React hooks are mostly thin wrappers
  around atom construction (`useTags`, `useSystemTagUri`, `useTaggedIds`,
  `useMessageTagsAtomFamily`).

### Shape

New `mailbox-controller.ts` (rule: **no React import** — enforce by review or
a lint boundary), exporting:

```ts
createMailboxController(ctx: {
  registry: Registry;            // atom registry
  mailbox: Mailbox.Mailbox;
  systemTag?: SystemTags.SystemTagId;
  filterProp?: string;
  invoke: OperationInvoker;      // capabilities passed in, never resolved inside
  graph: Graph; settings: Atom<InboxSettings>; showItem: …;
}) => {
  state: {                       // named scope of atoms, not positional props
    filterText: Atom.Writable<string>;
    items: Atom<InboxStackItem[]>;      // debounce → query → aggregate → post-filters
    loading: Atom<boolean>; showEmptyState: Atom<boolean>;
    tagsAtom: MessageTagsFamily; starredAtom: …; searchQuery: Atom<string|undefined>;
    pagination: PaginationHandle;       // atom-wrapped createPaginationStore
  };
  menu: Atom<ActionGraphProps>;  // the existing MenuBuilder computation, verbatim
  dispatch: (msg: MailboxMsg) => void;  // InboxStackAction ∪ navigate/clear-filter/save-filter/compose
}
```

`MailboxArticle.tsx` shrinks to construction (`useController(...)`) plus a
pure template: `Panel.Root` → `Menu.Root` toolbar → `<If
test={state.showEmptyState}>` → `InboxStack` bound to `state.*` and
`dispatch`. Build the minimal `If`/`Show` control-flow component as part of
the experiment so the template has no conditional braces.

### The four bridge points to instrument (the experiment's real product)

1. **DOM anchors.** `filterEditorRef` (focus on select-tag) and
   `filterSaveButtonRef` (popover anchor) are DOM refs inside logic. Probe:
   template registers named anchors (`anchors.set('save-filter', el)`);
   dispatch arms reference anchors by name. This answers "how does a
   renderer-neutral controller name DOM locations" (QML answers: by id).
2. **JSX inside the menu model.** The search box is embedded in the menu as
   `render: () => filterElement` — logic holding layout. Invert: the menu
   action declares `slot: 'filter'`; the template supplies the slot's element.
3. **Debounce as an atom.** No `Atom.debounce` exists in-repo; the derived
   debounced-filter atom needs a small utility (timer-based `Atom.make` with
   `get.setSelf`). Deliverable, not blocker.
4. **Pagination atom.** `Pagination.atom(db, query)` over the existing store;
   lifecycle owned by the registry. Candidate for `echo` proper if it works.

`useArticleKeyboardNavigation` and `useSelection` (attention) stay React-side
in v1, reading controller atoms.

### Hypotheses and measurements

- **H1 — separability.** The component ends with zero
  `useState`/`useEffect`/`useMemo`/`useCallback`. Measure: hook count and LOC
  split (expect ≈550 controller / ≈70 template). The `systemTagIdsKey` +
  eslint-disable memo dance should disappear (atom nodes compare by value).
- **H2 — headless testability.** A vitest test with `Registry.make()` (the
  `plugin-manager.test.ts` recipe) + an ECHO test layer: seed messages/tags →
  set `filterText` → advance debounce → assert `items`; `dispatch({type:
'star'})` → assert the tag index. No DOM, no `renderHook`.
- **H3 — performance.** React Profiler / `SurfaceMetrics` commit counts for
  (a) typing in the filter, (b) toggling a star, (c) a page fetch. Must be ≤
  current; expect a win on (a) — today every keystroke re-renders the whole
  article (toolbar, menu) because `filterText` is `useState` at the root.
- **H4 — renderer neutrality (stretch).** Drive the controller from a Node
  script (print `items` as filter changes) — the cheap proof — or a Solid
  story over `effect-atom-solid` if appetite allows.

### Order of work (riskiest first) and exit

1. Pagination atom wrapper → 2. filter/debounce/query atoms → 3. `dispatch` → 4. menu atom + slot inversion → 5. template + `If`. Behavior comments in the
   file (flash-empty prevention, seeded stores, draft reconciliation) are
   load-bearing — port them with the code; `applyPostFilters`/`reconcileDrafts`
   move unchanged. Regression: existing inbox e2e/storybook coverage plus H2's
   new headless tests.

Exit criteria (**partially met** — H3 was never measured; see Results): H1–H2
measured and written up, H3 deferred to the running app; the four bridge findings
(anchors, slots, debounce, pagination atom) folded back into this spec's
Recommendation step 1; a go/no-go on extracting a second, simple container
(`TaskSetArticle`) to test that the pattern generalizes downward as well as up.

### Results (implemented on this branch)

Status: **implemented and verified headlessly** — `mailbox-controller.ts` (~560
lines, no React import), `MailboxArticle.tsx` (~170-line template),
`useMailboxController.ts` (the bridge), `Show`, `debounce-atom.ts`,
`mailbox-menu-items.ts` (hooks → pure functions), and
`echo-react/paginationAtom.ts`. Verified: `tsc --build` clean on all changed
files; plugin-inbox node suite 237 passed / 0 failed (incl. 4 new controller
tests); echo-react 38 passed; oxlint clean.

- **H1 (separability): confirmed.** The article file has zero
  `useState`/`useEffect`/`useMemo`/`useCallback`; the one construction
  `useMemo` lives in the bridge hook. The `systemTagIdsKey` eslint-disable
  memo dance disappeared as predicted (atom nodes compare per-node). The
  template's only conditionals are `Show` nodes and prop expressions.
- **H2 (headless testability): confirmed, with two caveats.** Four vitest
  tests drive the controller through `Registry.make()` + `EchoTestBuilder` —
  items flow, debounce → query rebuild (both directions + empty-state), star
  toggle through the tag index, and the menu model (incl. the Drafts variant)
  — no DOM, no `renderHook`. Caveats worth institutionalizing: (a) an
  **unmounted atom's `registry.get` returns a cached first value** — tests
  must `registry.subscribe` (mount) atoms they poll, exactly as the template
  would; (b) fixtures must set `threadId` (`Builder … { threads: n }`) because
  the whole-thread semi-join matches on it — providers always set it.
- **H3 (performance): not measured here** (no browser profiling in this
  environment) — but two structural wins landed by construction: the menu
  atom no longer rebuilds per keystroke (the old `filterElement` memo dep
  forced it), and typing subscribes only the filter slot + query chain, not
  the article. Profiling remains open for a follow-up in the running app.
- **H4 (renderer neutrality):** the headless tests are themselves the cheap
  proof — the _extracted controller_ runs with no renderer at all. The
  container as a whole does not: the template, its React-side hooks, and the
  menu/module-graph dependencies listed below stayed React-bound, so this is
  neutrality of the logic layer, not of the container.

Bridge findings (the experiment's product), as instrumented:

1. **Pagination** — `createPaginationStore` was already framework-free;
   `paginationAtom` (echo-react) wraps it with AST-keyed rebuilds and
   page-seeding so upstream atom recomputes don't reset the window. Candidate
   for promotion into the echo API proper.
2. **Debounce** — no `Atom.debounce` upstream; `debounceAtom` built on
   `get.subscribe` + `get.setSelf` (~15 lines). Candidate for a shared home.
3. **Anchors** — the named-anchor record (`anchors.saveButton`,
   `anchors.filterEditor`, filled by template ref callbacks) was sufficient;
   dispatch arms reference DOM/imperative handles by name only.
4. **Slots** — inverted as designed (menu declares the slot, template supplies
   `MailboxFilterSlot`, which subscribes to atoms itself so the slot closure
   is stable). The remaining React leak is _typed_, not architectural: the
   menu model's `render?: () => ReactNode` lives in `@dxos/ui-types`, and
   `MenuBuilder` itself lives in `react-ui-menu` (a React package) — a
   headless menu-model package is the promotion path.

Two unplanned findings:

- **Headless-safety is a module-graph property.** The controller initially
  imported `isMessageGroup` through the `#components` barrel, dragging the
  whole UI runtime (mosaic → `@atlaskit` CJS with CSS `require`s) into node
  consumers. Type-only barrel imports + direct value imports fixed it; a lint
  boundary ("controller files import no component barrels") should enforce it
  when the pattern spreads.
- **`Show` is not slot-transparent.** Radix `asChild` composition can't slot
  through a control-flow component; the working idiom is to put the slotted
  element _inside_ each branch (`<Show>` wrapping two complete
  `<Panel.Content asChild>` blocks). An interpreter (Option B) hits the same
  issue and should adopt the same lowering.

Go/no-go on generalizing: **go** — extract `TaskSetArticle` next to test that
the pattern scales down without ceremony (its controller should be ~40 lines).

## Open questions

1. Should the authoring form of templates be a typed builder
   (`MenuBuilder`-style fluent API), literal TSX with a custom factory that
   emits `TemplateNode`s, or schema-validated object literals? (Builder is the
   repo's existing idiom; TSX-factory maximizes familiarity; literals maximize
   generability. They can coexist — the runtime consumes only the data model.)
2. Does the `ViewController` land as an Effect service per container
   (constructed via layers, `Database.layer(db)` provided at mount) or as a
   plain factory over the atom registry? The MenuBuilder/Board precedents use
   plain factories; Operations pull toward Effect services.
3. Is `CardLayoutAnnotation` per-schema (like `FormLayoutAnnotation`) or
   contributed separately from the type (so plugins can theme cards for types
   they don't own)? Surface-style contribution seems right but splits the
   source of truth.
4. How far do templates reach into chrome (toolbars/menus)? `MenuBuilder`
   already has an atom-native declarative model — templates should probably
   _reference_ menu models, not re-describe them.
5. Naming: "Surface templates" ties the feature to the existing resolution
   mechanism; "screens" (the react-ui-form term of art) may fit the named-
   variant axis (`default` | `card` | `compact`) better.
