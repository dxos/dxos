# Scenes — App Ontology and a Composition DSL

- **Date:** 2026-08-06
- **Status:** Exploration
- **Supersedes-in-part:** `2026-08-04-declarative-ui-abstraction-design.md` — its
  Experiment 1 (`MailboxController`) is **parked** (PR #12484 stands as the
  record); this document reframes the goal around composition rather than
  per-container controllers. The survey, prior-art table, and bridge findings
  of that spec remain the substrate here.

## The app ontology

Composer's UI reduces to a small set of universal idioms, and each is already
driven by data, not code:

| Pillar           | Idioms                            | Driving data                                                                                 | Status                                                                                                                                                                                                                   |
| ---------------- | --------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Navigation**   | navtree; deck / plank / companion | **app-graph** (nodes, connectors, companions)                                                | A plank entry is _just a graph-node id_; content resolves via one `AppSurface.Article` Surface dispatch; companions are child nodes (`~variant` linked segments); `LayoutOperation.Open` supports declared level chains. |
| **Presentation** | list / stack / combo; form; table | **ECHO queries + schema** — and crucially the **`View`** object: `{ query.ast, projection }` | `QueryAST` is pure data (`Query.fromAst` rehydrates); `View` is a persisted ECHO object that tables/kanban/forms already round-trip via `ProjectionModel`.                                                               |
| **Action**       | toolbar / menu                    | **Operations** (via app-graph actions + `MenuBuilder` atoms, `graphActions`)                 | Menus are `Atom<ActionGraphProps>`; toolbar contents derive from a graph node's contributed actions; execution is typed operation invocation.                                                                            |

**What's missing is the layer between navigation and presentation: authored
composition.** The deck composes at the _system_ level — user-arranged planks,
one graph node each. Inside a plank, an article is a hand-written component.
There is no way to _declare_ "a panel row with a splitter: an organizations
list on the left; tabs on the right holding a contact form and a notes
surface." Every such screen today is bespoke React (the previous spec's
"middle layer" diagnosis, seen structurally rather than logically).

We call these authored composites **Scenes**. (Not "Views" — `View` is
already, correctly, the name of the query+projection object that scene leaves
bind to. The layering is clean: a **View** describes _data_; a **Scene**
composes _containers over Views_.)

## Scenes

A Scene is:

1. **An ECHO object** — schema-validated composition data, like `BoardLayout`
   and `View` already are. Shareable, versionable, queryable, editable in
   place, and generable by an agent.
2. **Authored/interchanged as a small XML DSL** — the human- and LLM-friendly
   surface form. Parsed to a typed node tree (Effect Schema union); the XML
   and the model are bidirectional (agent emits XML; editors mutate the
   model). Same architecture as the sketch scene DSL:
   _dialect → intermediate model → renderer_ — and the name is no accident;
   this is that pattern applied to chrome instead of a canvas.
3. **Rendered by an interpreter over existing primitives** — `Splitter`
   (2-way, controlled rem sizes), `Mosaic.Stack` + `ResizeHandle` (N-way
   resizable rows), `Tabs`/`Pane.Tabs`, `Panel`/`Pane`, the list/form/table
   composites, `MenuBuilder` toolbars, and a `Surface` escape hatch.
4. **A graph node like any other** — a Scene opens as a plank through the
   normal article Surface dispatch, so composition nests inside navigation
   without new machinery. The deck neither knows nor cares that a plank's
   article is interpreted rather than hand-written.

### The DSL

Closed, small, extensible by registry — a grammar of _containers_ and
_idioms_, deliberately not a widget language:

```xml
<scene name="crm" label="CRM">
  <toolbar node="$node"/>
  <split direction="row" size="20rem">
    <panel>
      <list id="orgs" view="dxn:echo:@:ORG_VIEW" />
    </panel>
    <tabs>
      <tab label="Details">
        <form subject="#orgs.selection" view="dxn:echo:@:ORG_FORM_VIEW"/>
      </tab>
      <tab label="Contacts">
        <list id="contacts" view="dxn:echo:@:CONTACTS_VIEW" scope="#orgs.selection"/>
      </tab>
      <tab label="Notes">
        <surface role="article" subject="#orgs.selection.notes"/>
      </tab>
    </tabs>
  </split>
</scene>
```

- **Container elements** — `split` (maps to `Splitter`; nest for more than
  two), `stack` (N-way `Mosaic.Stack` row/column), `tabs`/`tab`
  (`AppSurface.Tabpanel` already exists as a role), `panel` (chrome shell:
  toolbar rail + content + status bar, i.e. `Panel`/`Pane`).
- **Idiom elements** — `list`, `table`, `form`, `toolbar`, `menu`. Each binds
  to the pillar's data: `view=` (a `View` DXN: query + projection — the whole
  binding in one ref), `subject=` (object ref or context reference),
  `node=` (graph node for toolbar actions).
- **Escape element** — `surface role=… subject=…`: any hand-written container
  (MailboxArticle, an editor, a canvas) embeds as a normal Surface dispatch.
  Custom code doesn't fight the DSL; it plugs into it exactly as it plugs
  into the deck today.
- **References, not expressions.** The only dynamic vocabulary is: `$node` /
  `$subject` (the scene's own graph node / subject object), and `#id.…`
  element references (`#orgs.selection`) wired through the existing
  attention/ViewState selection contexts, keyed by scene-element id. Deriving,
  filtering, and computing stay out of the grammar (the previous spec's
  QML-trap guard). If a scene needs logic, that logic belongs in an operation,
  a View's query, or a custom surface.

Cross-element wiring worth calling out: `scope="#orgs.selection"` narrows a
View's query by a context object (a parameterized query — the one View
feature this design asks for that doesn't exist yet); selection itself
persists via ViewState exactly as plank selection does today, so a scene
reopens in its last state for free.

### Behavior: machines per component (the zag layer)

Composition data says _where things are_; something must own _how they
behave_ (tab switching, splitter drag, list selection/navigation, menu
traversal). The direction: each idiom/container component carries a
**framework-agnostic state machine** in the zag.js sense — behavior as a
statechart with a thin `connect()` per renderer (React today; Solid/Lit
later) — rather than bespoke hooks per component.

- This is the renderer-independence seam applied to _behavior_, complementing
  atoms as the seam for _state_ and Scenes as the seam for _structure_. A
  plausible in-house shape: machines whose store is an effect-atom, so
  machine state composes with the rest of the reactive graph and is
  headless-testable with the same `Registry.make()` recipe proven in the
  parked experiment.
- Precedent in-repo: `xstate` v4 (shell invitation flows) proves statecharts
  fit; the aspect hooks of `react-ui-list` (`useListSelection`,
  `useListNavigation`) are half-way there — machine-shaped behavior, but
  React-bound. Adopting `@zag-js` wholesale vs. writing atom-native machines
  is an open trade (zag brings a11y-hardened machines for tabs/menu/splitter
  out of the box; atom-native keeps one reactive substrate).

### Specification: the MDL component dialect (the DEUS layer)

Every scene element name resolves to a **component contract**, and each
contract has three coordinated representations:

1. the **machine** (behavior, renderer-neutral),
2. the **renderer binding** (`connect()` + markup per framework),
3. an **MDL declaration** — an `org.dxos.mdl.component@1.0` block (the
   dialect `PLUGIN.mdl` files already use) describing the element: its
   attributes, bindings, emitted actions, and machine states.

The MDL block is what makes the system _self-describing_: the scene DSL's
vocabulary is enumerable by an agent (which elements exist, what they bind,
what they do), so generation is grounded — the assistant reads the component
declarations, emits scene XML, and the schema-validated parse rejects
anything outside the vocabulary. DEUS-style spec documents become the
registry's documentation surface, kept next to the code they describe.

### Extensibility

One registry, mirroring `XmlWidgetRegistry`'s shape and `Surface.create`'s
contribution style: plugins register
`tag → { attrSchema, component | machine, connect, mdl }`. Custom behavior
enters as (a) a new registered element with its contract, or (b) a `surface`
embed — never as logic in the grammar.
The parser is generic over the registry (the FormLayout parser proved the
string-DSL → typed-tree → renderer pattern; its hard-coded two-tag grammar is
the part to generalize).

## What this changes vs. the parked direction

|                | Experiment 1 (parked)                                   | Scenes                                                                                     |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Unit of attack | One complex container's _logic_ (controller extraction) | The _structure_ of the common case (composition)                                           |
| Bespoke logic  | Extracted but still per-container                       | Eliminated for scene-expressible screens; embedded via `surface` where it genuinely exists |
| Behavior       | One `dispatch` per container                            | Standard machines per component, shared across all scenes                                  |
| Serializable   | No (controller is code)                                 | Yes (scene object; XML interchange; agent-generable)                                       |

What carries over from the experiment's findings: `paginationAtom` (scene
lists need it), the headless module-graph discipline (machines and the
interpreter core must not drag renderer barrels — enforced by the same
type-only-import rule), the `Show`/`asChild` lowering lesson (the interpreter
places slotted elements inside branches), and the named anchor/slot patterns
(machines reference DOM by name through `connect`, which is exactly zag's
prop-getter model).

## Experiment 2 (proposed): a walking-skeleton Scene

Time-boxed vertical slice, smallest end-to-end loop:

1. **Model + codec.** `Scene` ECHO type (Effect Schema node union: `split`,
   `tabs`, `panel`, `list`, `form`, `toolbar`, `surface`); XML parser
   (generalized from the FormLayout approach, generic over an element
   registry) and printer (model → XML) — round-trip tested headlessly.

   That union is the **closed subset for this slice** (plus `scene` as the
   document root and `tab` as `tabs`'s item element). The DSL section above
   also shows `stack`, `table`, and `menu`; those are registry entries the
   skeleton does not ship, and the codec must _reject_ an unknown tag with
   the tag name and its position, never drop it silently — a dropped element
   is a scene that renders as if the author never wrote it. The registry is
   the source of truth for which tags exist; the union is the source of truth
   for which ones this build interprets.

   **Untrusted input.** Scene XML arrives from the assistant and from a raw
   text editor, so schema validation is the second gate, not the first. The
   parser runs with entity processing off, rejects DTD/DOCTYPE declarations
   outright, and bounds both input size and nesting depth. Entity expansion,
   oversized input, and deep nesting each get a test — the parser is the
   trust boundary of the whole design.

2. **Interpreter.** React renderer mapping nodes onto `Splitter`, `Tabs`,
   `Panel`, `List`/`Mosaic`, `ObjectForm` (bound via `View` +
   `ProjectionModel`), `MenuBuilder` + `graphActions`, and `Surface`.
   Selection wiring via attention contexts keyed by element id.
3. **Plumbing.** A plugin (`plugin-scene`) contributing: the type, an article
   surface for it (a Scene opens as a plank), create-object, and a raw-XML
   editor companion as the interim "scene editor."
4. **Dogfood.** One master-detail scene over CRM-ish types (organizations
   list → contact form + related list), created live in Composer — and
   generated once by the assistant through the existing `<surface>` widget
   channel to prove the generation loop. The detail pane binds by
   **selection, not by `scope`**: `scope=` is unspecified end-to-end (open
   question 1) and stays out of this slice, so the skeleton wires selection
   through the interpreter's attention context and leaves the parameterized
   query for the design that follows.
5. **One machine.** Pick a single component (tabs is the smallest real one)
   and implement its behavior as a framework-agnostic machine + `connect`,
   with an MDL component block — the probe for the zag/MDL layer without
   betting the slice on it.

Exit criteria: the scene object round-trips XML ↔ model ↔ render; the
dogfood scene works as a plank with persistent splitter/tab/selection state;
the assistant generates a valid scene from a prompt; a written recommendation
on zag-adoption vs. atom-native machines with the tabs machine as evidence.

## Open questions

1. **`scope` / parameterized Views.** Narrowing a View's query by a context
   object (`scope="#orgs.selection"`) has no current mechanism — options: a
   query-AST placeholder substituted at bind time, or a `View` variant that
   declares parameters. This is the largest new capability the design needs,
   and it must be specified across the node schema, codec, registry/MDL
   contract, and interpreter together before any of them accepts the
   attribute. The DSL examples above use it illustratively; it is not part of
   Experiment 2.
2. **Machines: adopt `@zag-js` or build atom-native?** Adoption buys hardened
   a11y machines; atom-native keeps one reactive substrate and matches the
   headless-test recipe. The tabs probe (Experiment 2 §5) decides.
3. **Scene editing UX.** Raw XML companion first; a structural editor (form
   over the node schema, or drag-compose like Board) later — which second?
4. **How far does `scene` reach into the deck?** A companion could itself be
   a scene; a type could declare its default article _as_ a scene
   (`AppAnnotation`-style), letting simple plugins ship no article component
   at all. Both are natural extensions once the walking skeleton stands.
5. **MDL tooling.** Component blocks are hand-authored today; whether the
   registry generates MDL (from attr schemas + machine definitions) or MDL
   remains documentation-by-convention affects how trustworthy
   agent-generation grounding is.
