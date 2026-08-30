# ui-template — CONTAINERS

An audit of the plugin containers the template system would have to replace, run against two
representative plugins — `plugin-tasks` and `plugin-projects` — chosen because they span the
range: a plain toolbar-plus-list article, a CodeMirror-hosting outline, a dialog, cards, and a
composite article that embeds other plugins' surfaces. The hypothesis under test: **containers
assemble components and manage interaction via local state and hooks, and both halves are
candidates for the template grammar** ([`README.md`](../README.md)) plus the module contract
([`DESIGN.md` › Typed binding and modules](./DESIGN.md#typed-binding-and-modules-proposal)).

Three sections: what the containers actually do (§1), how each function maps onto the template
system (§2), and the recurring idioms across all of them with a progressive factoring order (§3).
Rules cited as `R-n` come from [`ONTOLOGY.md`](./ONTOLOGY.md) §5; data primitives (`ref`, `query`,
`operation`, `capability`…) from its §3 table.

**Scope.** Every component that composes others and owns interaction state, from both plugins'
`src/containers` and `src/components` — ten top-level units (7 in plugin-tasks, 3 in
plugin-projects), with their private sub-components audited in place. Pure leaf renderers
(`MilestoneRow`, `ObjectTile`) are noted under their owner rather than listed separately.

## 1. Audit

### 1.1 plugin-tasks

#### JournalArticle

[`packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx`](../../../plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx)

Article surface for a `Journal`. Renders a `Panel.Root` with a toolbar (`Toolbar.ToggleGroup`
toggling a calendar) and a two-region body: an optional `Calendar.Root`/`Calendar.Grid` beside the
`Journal` component, grid- or column-arranged by breakpoint.

| Concern      | Implementation                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| Local state  | `showCalendar` (`useState<boolean>`); `controllerRef` (`useRef<CalendarController>`)                 |
| Hooks        | `useTranslation`, `useMediaQuery('md')`                                                              |
| Interactions | Toggle-group writes `showCalendar`; `onSelect` from Journal calls `controllerRef.current.scrollTo()` |

No data access of its own — the `Journal` component owns the object subscription. The one
non-trivial wire is imperative: a date selection in the journal scrolls the calendar via a
controller ref, not via state.

#### OutlineArticle

[`packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx`](../../../plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx)

Article surface for an `Outline`, and the densest container in the set. Renders either the
outline editor (`Outline.Root`/`Outline.Content` inside `Menu.Root` + `Panel.Root`, toolbar
optional for the embedded case) or — when the user activates a link that resolves to a `Task` and
no embedder claims it — an inline `TaskForm` (private sub-component: schema-driven
`Form.Root` with `autoSave`, writing field-by-field through `Obj.update`/`Obj.setValue`) with a
back button.

| Concern      | Implementation                                                                                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local state  | `selected` (`useState<URI>` — link navigated into); `convertible` (`useState<boolean>` — caret-item promotable); `tick`/`bump` (`useReducer` counter); `outlineRef` (`useRef<OutlineController>`)                               |
| Derived      | `ref` (`useMemo` from `selected` + db); `resolveLinkLabel` (`useMemo` map of task URI → title, keyed on `tasks` + `tick`)                                                                                                       |
| Hooks        | `useTranslation`, `useResolveRef` (×2: link target, `outline.content`), `useQuery` (tasks via `Filter.childOf(taskSet)`), `useMenuBuilder` (×2: task-view actions, outline actions), `useEffect` (×2), `Obj.subscribe` per task |
| Interactions | `handleConvertToTask` (ECHO mutation via `TaskSet.addTask`), `handleSelectLink`/`handleBack` (local navigation), `handleConvertCurrent` (imperative controller call), `onSelectTask` hand-off to the embedder                   |

Two idioms worth flagging now: the `tick`/`bump` reducer exists solely because `useQuery` re-emits
on membership change only, so per-member renames need manual `Obj.subscribe` fan-out; and the
convert-to-task affordance is _withheld_ (not disabled) when no `taskSet` destination exists.

#### Outline (component; `Outline.Root` / `Outline.Content`)

[`packages/plugins/plugin-tasks/src/components/Outline/Outline.tsx`](../../../plugins/plugin-tasks/src/components/Outline/Outline.tsx)

Radix-style composite hosting the CodeMirror outliner. `Root` holds a context provider plus a
`useImperativeHandle` controller (`focus`, `convertToTask`); `Content` builds the editor via
`useTextEditor` with ~10 extensions (data sync, markdown, outliner, xml anchor chips, hashtag,
host-contributed extras), an `EditorMenuProvider` with computed command groups, and DOM-level
event plumbing.

| Concern      | Implementation                                                                                                                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local state  | `convertible` (`useState`); `root` (`useState<HTMLDivElement>` for capture-phase listener); `viewRef` (`useRef<EditorView>`); `reportConvertible` (`useRef` holding the latest callback so stale extension closures stay valid)             |
| Hooks        | `useTextEditor`, `useThemeContext`, `useTranslation`, `useImperativeHandle`, `useEffect` (×3: seed convertible, `syncLinkLabels` reconciliation, `DX_ANCHOR_ACTIVATE` capture listener)                                                     |
| Interactions | Editor menu items (convert-to-task, delete-row — both behind `setTimeout` focus hacks), `convertItemToTask` (async, with a re-check after the await guarding against caret races), update-listener publishing convertibility on caret moves |

This is tier-1 _opaque_ component state in the DESIGN.md sense: cursor, selection, decorations.
The container boundary sees it only at commit points (`onConvertToTask`, `onConvertibleChange`,
`onSelectLink`).

#### Journal (component)

[`packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx`](../../../plugins/plugin-tasks/src/components/Journal/Journal.tsx)

Scrollable list of `JournalEntry` rows (each an `Outline.Root` under a date header) plus a
"start today" button when no entry exists for today.

| Concern      | Implementation                                                                                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local state  | Per-entry: `focused` (`useState`, focus/blur capture), `outlinerRef` (`useRef<OutlineController>`)                                                                   |
| Derived      | `entryRefs` (`useMemo`: entries map → sorted array), `hasTodayEntry` (`useMemo`), `isRecent` (`useMemo`)                                                             |
| Hooks        | `useObject` (×3: journal snapshot, entry ref, entry content ref — the last purely to re-render when the Text loads), `useTranslation`                                |
| Interactions | `handleCreateEntry` (ECHO mutation: `Obj.update` inserting a `Ref` keyed by date), `handleFocus` (imperative `outlinerRef.current.focus()` + `onSelect` date report) |

#### TaskSetArticle

[`packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx`](../../../plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx)

Article/section surface for a `TaskSet`. Renders `TaskList.Root` (hierarchical, drag-reorderable,
`Alt`+arrow restructure) with a create field; wraps in `Panel.Root` + attention-gated toolbar for
the article role, bare for the section role. The exemplary write-path container: **every CRUD
verb dispatches an Operation** (`TaskOperation.CreateTask/UpdateTask/DeleteTask`) so the UI and
external agents share one write path.

| Concern      | Implementation                                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Local state  | `selected` (`useState<string>`)                                                                                                                                                                        |
| Derived      | `useSetTasks`: `useQuery` (`Filter.childOf`) → `useMemo` `Atom.make` ordering by the set's `tasks` array and subscribing to every member's `parentTask` (`subscribeHierarchy`) → `useAtomValue`        |
| Hooks        | `useTranslation`, `useAttention`, `useOperationInvoker`, `useQuery`, `useAtomValue`                                                                                                                    |
| Interactions | `handleCreate`/`handleUpdate`/`handleDelete` (operation dispatch with `spaceId` context), `handleMove` (direct model call `TaskSet.moveTask` — the one write that bypasses operations), `handleSelect` |

#### OutlineCard

[`packages/plugins/plugin-tasks/src/containers/OutlineCard/OutlineCard.tsx`](../../../plugins/plugin-tasks/src/containers/OutlineCard/OutlineCard.tsx)

Card-content surface: a read-only `Outline.Root`/`Outline.Content` in a `Card.Body`. No hooks, no
state; one sync `subject.content.target` guard (returns `null` while unresolved — the async-ref
idiom in its most naive form).

#### QuickEntryDialog

[`packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx`](../../../plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx)

Dialog surface: `Dialog.Content` hosting a local-schema `Form.Root` (`QuickEntryForm`, one
validated markdown field) with a custom action row (`QuickEntryActions`: cancel / save-and-add-
another / save).

| Concern      | Implementation                                                                                                                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local state  | `formKey` (`useState<number>` — remount-to-reset), `contentRef`, `continueRef` (`useRef<boolean>` — save-mode flag threaded to actions), `formSaveRef` (`useRef<fn>` — form's save exposed to the keyboard handler)                         |
| Hooks        | `useTranslation`, `useOperationInvoker`, `useFormContext` (in actions), `useEffect` (×2: rAF autofocus via DOM `querySelector`, publish save-fn)                                                                                            |
| Interactions | `handleSave` → `OutlineOperation.QuickJournalEntry` then either bump `formKey` (continue) or `LayoutOperation.UpdateDialog { state: false }`; `handleCancel` → close dialog; `Cmd+Shift+Enter` capture-phase shortcut for save-and-continue |

Dialog open/close is _already_ an operation (`LayoutOperation.UpdateDialog`) — the container never
holds an "open" boolean. The refs exist to smuggle callbacks across the form boundary, a pattern
that dissolves entirely under published state.

### 1.2 plugin-projects

#### ProjectArticle

[`packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx`](../../../plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx)

The composite: article surface for a `Project`, two tabs. Overview renders a schema-picked header
form (`HeaderValues` via AST pick), the owned `InstructionsEditor` (twice: full and
context-fields-only), an embedded outline **section surface** (`Surface.Surface` delegating back
to plugin-tasks' `OutlineArticle`, threading `taskSet`, `onSelectTask`, and collected editor
extensions), a read-only `MilestoneList`, and an `ObjectGallery` (Masonry of `ObjectCard` tiles).
Tasks gives the whole panel to the `TaskSet` section surface.

| Concern      | Implementation                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local state  | `tab` (`useState<'overview' \| 'tasks'>`)                                                                                                                                                                                                                                                                                                                                                                                                            |
| Derived      | `defaultValues` (`useMemo`, read once per project identity), `outlineExtensions` (`useMemo` over capability providers), `objectsAtom` in `ObjectGallery` (`useMemo` `Atom.make` over `ref.atom` per artifact)                                                                                                                                                                                                                                        |
| Hooks        | `useTranslation`, `useOperationInvoker`, `useObject` (×2: project, `taskSet.milestones`), `useResolveRef` (×3: instructions, taskSet, outline), `useCapabilities` (markdown extension providers), `useMenuBuilder` (toolbar), `useAtomValue`; per-row `useObject` in `MilestoneRow`/`ObjectCard`                                                                                                                                                     |
| Interactions | `handleOpen` → `LayoutOperation.Open`; `handleDeleteArtifact` (ECHO splice + `SpaceOperation.RemoveObjects`); `handleAddArtifact` (`SpaceOperation.OpenObjectForm` dialog round-trip, then ECHO append); `handleValuesChanged` (ECHO header writes); `createChat` (3-operation sequence: `AssistantOperation.CreateChat` → `Chat.linkCompanion` + `SpaceOperation.AddObject` → `AssistantOperation.SetCurrentChat`); `handleSelectTask` (tab switch) |

Notable: tab content is rendered by hand rather than `Tabs.Panel` because Radix's hidden-mount
frame breaks masonry measurement — a renderer-level concern leaking into the container.

#### CreateProjectPanel

[`packages/plugins/plugin-projects/src/components/CreateProjectPanel/CreateProjectPanel.tsx`](../../../plugins/plugin-projects/src/components/CreateProjectPanel/CreateProjectPanel.tsx)

Create-dialog panel: a name `Input` plus a `SearchList` picker over capability-contributed
templates.

| Concern      | Implementation                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Local state  | `name` (`useState<string>`, controlled input)                                                                                 |
| Derived      | `sorted` (`useMemo`: filter by `appliesTo(undefined)` + sort by label); `results` via `useSearchListResults` (filter machine) |
| Hooks        | `useTranslation`, `useCapabilities` (`ProjectCapabilities.Template`), `useSearchListResults`                                  |
| Interactions | `handleSelect` → `onCreateObject({ name, templateId })` (host callback, not a dispatched operation)                           |

#### ObjectCard

[`packages/plugins/plugin-projects/src/components/ObjectCard/ObjectCard.tsx`](../../../plugins/plugin-projects/src/components/ObjectCard/ObjectCard.tsx)

Summary tile for a linked object: header from schema annotations (icon, label), optional delete
menu, body delegated to the object's own `CardContent` surface.

| Concern      | Implementation                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Local state  | none                                                                                                                          |
| Hooks        | `useObject` (reactive rename), `useTranslation`, `useCallback` keyboard handler                                               |
| Interactions | `onClick`/`onDelete` host callbacks; hand-wired Enter/Space activation (Card.Root gives `role='button'` but no key semantics) |

## 2. Mapping onto the template system

Legend: **today** = expressible with the spike as landed (grammar + published slots + operations);
**proposal** = needs the module contract / ladder (DESIGN.md — `var`/`use`/`from`, typed export
tables, machine instances) or a primitive that is design-only in ONTOLOGY §3 (`ref`, `query`,
`view`, `capability` bindings); **MISSING** = needs a genuinely new construct, named in §2.1.

#### JournalArticle

| Function                             | Template construct                                                   | Status                               |
| ------------------------------------ | -------------------------------------------------------------------- | ------------------------------------ |
| Panel + toolbar + body composition   | `container` / `layout` / `command`                                   | today                                |
| Calendar toggle (`showCalendar`)     | `let` (rung 1) + `show`/`fallback`; toggle button `on-activate` → op | today                                |
| Grid vs column by breakpoint         | —                                                                    | MISSING (responsive aspects, `R-14`) |
| Scroll-calendar-to-date on selection | —                                                                    | MISSING (command channel)            |
| Toolbar labels                       | `label` aspect                                                       | MISSING (i18n binding)               |

#### OutlineArticle

| Function                                                  | Template construct                                              | Status                                                                 |
| --------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Outline-vs-task-form swap on `selected`                   | `show`/`fallback` over a `let` slot written by ops              | today                                                                  |
| Back button clearing selection                            | `control as="button"` `on-activate` → op (`scope.set`)          | today                                                                  |
| Resolve `selected` URI → object; `outline.content` → text | `ref` binding + `show` absent state                             | proposal (`R-2`)                                                       |
| Live task list for label resolution                       | `query` binding                                                 | proposal (`R-2`)                                                       |
| Per-task rename subscription (`tick`/`bump`)              | fine-grained reactivity semantics of `query`/`object` bindings  | proposal (must be defined; the manual fan-out is the gap made visible) |
| Derived label map (`resolveLinkLabel`)                    | derived typed export (module state column 1)                    | proposal                                                               |
| Convert-to-task (ECHO mutation)                           | `on-*` → operation                                              | today (needs the mutation promoted to an operation)                    |
| Withhold vs disable the promote action                    | `show` around the `command` child; `disabled` from a bound slot | today                                                                  |
| Toolbar via `useMenuBuilder`                              | `command` + `control as="button"`                               | today (parts gap `R-10` for real menus)                                |
| Task form (schema-driven, autoSave)                       | `form` + projection schema (`R-5`)                              | today                                                                  |
| Imperative `convertToTask` from toolbar                   | —                                                               | MISSING (command channel)                                              |
| Host-contributed editor extensions                        | —                                                               | MISSING (editor embedding contract)                                    |

#### Outline / Journal (components)

The CodeMirror internals are tier-1 opaque state by design (DESIGN.md › Data structure) — the
template never sees them, so most rows are _out of scope rather than missing_: the editor is a
component the renderer maps a kind onto. What crosses the boundary:

| Function                                     | Template construct                                    | Status                                   |
| -------------------------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| `convertible` published to two consumers     | machine slot written by an operation the editor fires | proposal (component→state commit points) |
| `onSelectLink` / `onConvertToTask` callbacks | `on-*` → operation                                    | today                                    |
| Journal entry list (sorted map → rows)       | `collection` over a derived export                    | proposal (derived state)                 |
| "Start today" button when no entry           | `show`/`fallback` + `command`                         | today                                    |
| Create-entry ECHO write                      | operation                                             | today (promote the inline `Obj.update`)  |
| Per-entry focus tracking, focus-on-header    | —                                                     | MISSING (focus scope + command channel)  |
| Virtualization (`TODO: Virtualize`)          | —                                                     | MISSING (collection aspect)              |

#### TaskSetArticle

| Function                                          | Template construct                                               | Status                           |
| ------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| Task list composition + create field              | `collection` + `control` (`R-10` parts for the tree rows)        | today (coarse)                   |
| Selection                                         | `let machine="…selection"` (the spike's proven machine)          | today                            |
| CRUD via `TaskOperation` verbs                    | `on-*` → operation keys — **already the template's write model** | today                            |
| Ordered/hierarchical derivation (`useSetTasks`)   | derived typed export of the owning module                        | proposal                         |
| Live query + per-member `parentTask` subscription | `query` binding + reactivity semantics                           | proposal (`R-2`)                 |
| Drag reorder / `Alt`+arrow restructure            | drop lands as an operation (`handleMove`), gesture itself —      | MISSING (DnD vocabulary)         |
| Attention-gated toolbar                           | read of app-level published state                                | proposal (module read via `use`) |
| Article vs section chrome by role                 | `switch`/`match` on a role binding                               | today                            |

#### OutlineCard

| Function                    | Template construct            | Status           |
| --------------------------- | ----------------------------- | ---------------- |
| Read-only preview in a card | `container` + readonly aspect | today            |
| `.target` sync guard        | `ref` binding + `show`        | proposal (`R-2`) |

#### QuickEntryDialog

| Function                                                    | Template construct                                    | Status                                                                   |
| ----------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| Dialog chrome + form + action row                           | `container` + `form` + `command`                      | today                                                                    |
| Local schema, validation                                    | `form` bound to a registry schema                     | today                                                                    |
| Save → operation → close via `LayoutOperation.UpdateDialog` | operation chaining — each `on-*` is one key           | proposal (sequencing lives in the handler; fine if the op composes both) |
| Save-and-continue (reset form, keep open)                   | operation writing a slot the form keys off            | proposal (instance lifecycle, DESIGN open question 4)                    |
| `Cmd+Shift+Enter` shortcut                                  | —                                                     | MISSING (key-event vocabulary)                                           |
| rAF autofocus into the field                                | —                                                     | MISSING (focus scope)                                                    |
| `continueRef`/`formSaveRef` plumbing                        | dissolves: published state replaces closure-smuggling | today (by construction)                                                  |

#### ProjectArticle

| Function                                              | Template construct                                           | Status                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Tabs (overview/tasks)                                 | `tabs`/`tab` + a `let` slot (ViewSwitch story at real scale) | today                                                                     |
| Header form (picked schema, defaults, live write)     | `form` + `view` projection (`R-5`)                           | today                                                                     |
| Resolve instructions/taskSet/outline refs             | `ref` bindings + `show`                                      | proposal (`R-2`)                                                          |
| Embedded outline / taskSet sections                   | `surface` kind (role + subject + pass-through data)          | proposal (surface node, specced in DESIGN.md › Surfaces)                  |
| Milestone list, per-row subscription                  | `collection` over `ref` items                                | proposal (`R-2` + item-level reactivity)                                  |
| Artifact gallery (`ref.atom` filter-resolve)          | `collection` over `ref` items, absent items omitted          | proposal (`R-2`)                                                          |
| Masonry arrangement                                   | `arrangement`/`layout` variant                               | MISSING (sub-discriminator `R-9`; the hidden-mount bug is renderer QA)    |
| Toolbar (create-chat, add-artifact)                   | `command` + operations                                       | today (the 3-op `createChat` sequence must become one composed operation) |
| Add-artifact dialog round-trip (result → ECHO append) | operation invoking an operation and consuming its result     | proposal (operation results are outside the current dispatch contract)    |
| Collected editor extensions (`useCapabilities`)       | `capability` binding through a module                        | proposal (module contract column 3)                                       |
| Cross-plugin operations (Layout/Space/Assistant)      | `on-*` with foreign module keys                              | proposal (module contract: dispatch through the owning module's table)    |

#### CreateProjectPanel

| Function                               | Template construct                                | Status                                     |
| -------------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Name input (controlled)                | `control` + rung-1 `let` (FilterList story)       | today                                      |
| Template list (filter + sort + search) | `let` filter slot + derived export + `collection` | today/proposal (derivation needs an owner) |
| Capability-contributed templates       | `capability` binding                              | proposal                                   |
| Select → host callback                 | `on-select` → operation                           | today (callback becomes an op)             |

#### ObjectCard

| Function                           | Template construct                     | Status                                                                    |
| ---------------------------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| Label/icon from schema annotations | `display` bound to object metadata     | today                                                                     |
| Delegated card body                | `surface` kind                         | proposal                                                                  |
| Delete menu                        | `command` (`R-10` parts for menus)     | today (coarse)                                                            |
| Enter/Space activation             | renderer duty, not template vocabulary | today (by construction — the renderer's component must own key semantics) |

### 2.1 Conclusions

**Fully expressible today** (grammar + slots + operations, given the mechanical promotion of
inline ECHO writes to operations): **OutlineCard**, **CreateProjectPanel**, and **QuickEntryDialog**
minus its keyboard shortcut and autofocus — all three are forms/lists over locally-declared state,
exactly the anonymous-module shape the stories already prove.

**Need the module proposal** (typed `ref`/`query`/`capability` bindings, derived exports, machine
instances, surface nodes): **TaskSetArticle** (closest — its write path is already operations; it
needs `query` + derived ordering + the selection machine), **JournalArticle**/**Journal**,
**OutlineArticle**, **ObjectCard**, and the bulk of **ProjectArticle**. The recurring blocker is
one and the same: nothing in the template resolves a `ref` or a live `query` (`R-2`), and every
container's most intricate code (`useResolveRef` guards, `Atom.make` wrappers, `tick`/`bump`
subscription fan-outs) is hand-rolled compensation for that single gap.

**Need genuinely new constructs** — named:

1. **`ref`/`query` binding resolution** (`R-2`) — the async data primitives exist in ONTOLOGY §3
   but nothing implements them; `show` covers the absent state, the resolution itself is the
   construct. Includes defining re-emit granularity (membership vs member-property), which today
   costs each container a manual subscription idiom.
2. **Command channel** — imperative verbs directed at a component instance (`scrollTo(date)`,
   `focus()`, `convertToTask()`, `save()`), today `useRef` controllers. The machine-instance
   capability (contract column 3) is the shape — a command is an event sent to a named instance —
   but nothing in the grammar can address one yet.
3. **Surface node** — the open-world escape (`ProjectArticle`'s sections, `ObjectCard`'s body).
   Specced in DESIGN.md › Surfaces; not in `TAGS`.
4. **i18n label binding** — every container calls `useTranslation`; the grammar's `label` aspect
   is a raw string. Needs a translated-label attribute (`label-key`) resolving through the
   registry, or labels stay untranslatable.
5. **Interaction vocabulary: keys, focus, DnD** — `Cmd+Shift+Enter`, rAF autofocus, focus scopes,
   drag-reorder gestures. The _outcomes_ are operations already; the _triggers_ have no grammar.
   Candidates: `on-key-*` events, a focus-scope aspect, drop-target declarations whose payload
   dispatches an operation.
6. **Layout gaps already on file** — responsive/geometry aspects (`R-14`), sub-discriminators for
   masonry/tab-bar (`R-9`), parts for menus and list rows (`R-10`), collection virtualization.
7. **Editor embedding contract** — a kind for an opaque tier-1 editor with host-contributed
   extensions and commit-point operations; today's `Outline.Root` props are the de-facto contract.

## 3. Idiom catalog

Nineteen recurring idioms across the ten units. Mapping column: **(a)** existing template
construct; **(b)** a machine/module provision per the contract's capabilities column; **(c)** a
reusable React hook as the intermediate step. Occurrences cite the file that exhibits the idiom.

| #   | Idiom                                  | Occurrences                                                                                                                                                      | Current shape                                                              | Maps to                                                                                                                                   |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Single selection                       | `TaskSetArticle` (`selected`), `OutlineArticle` (`selected` URI)                                                                                                 | `useState<string \| URI>` + select/clear callbacks                         | (b) selection machine — already proven in the spike's MasterDetail story                                                                  |
| 2   | View switch / tabs                     | `ProjectArticle` (`tab`), `JournalArticle` (`showCalendar`)                                                                                                      | `useState` enum/bool + conditional render                                  | (a) `tabs`/`switch`/`show` over a rung-1 `let`; (b) once guarded                                                                          |
| 3   | Draft-edit-commit                      | `QuickEntryDialog`, `OutlineArticle` (`TaskForm` autoSave), `ProjectArticle` (header `defaultValues` + `onValuesChanged`)                                        | `Form.Root` buffer; commit = op or `Obj.update`                            | (a) `form` + tier-1 draft, commit as operation                                                                                            |
| 4   | Filter/search                          | `CreateProjectPanel` (`useSearchListResults`), `Outline` hashtag search                                                                                          | text state + derived filtered list                                         | (a) proven by the FilterList/Combobox stories; derivation → (b) module export                                                             |
| 5   | Async ref load + empty                 | `OutlineArticle` (×2), `ProjectArticle` (×3 + gallery `ref.atom`), `Journal` (`entry.content`), `OutlineCard` (`.target` guard)                                  | `useResolveRef` / `Atom.make(get(ref.atom))` / sync guard returning `null` | needs new construct §2.1-1; (c) `useResolveRef` _is_ the interim hook                                                                     |
| 6   | Subscribe-to-query                     | `OutlineArticle`, `TaskSetArticle` (`useSetTasks`)                                                                                                               | `useQuery(db, Filter.…)`                                                   | needs §2.1-1 (`query` binding); (c) `useQuery` is the interim                                                                             |
| 7   | Per-member subscription fan-out        | `OutlineArticle` (`tick`/`bump` + `Obj.subscribe`), `TaskSetArticle` (`subscribeHierarchy`), `ProjectArticle` (`MilestoneRow`), `ObjectCard` (`useObject`)       | manual subscribe per item, or row component subscribing itself             | (b) reactivity semantics of the `query`/`collection` binding; (c) extract `useQueryWithMembers` first                                     |
| 8   | Derived collection (sort/order/filter) | `Journal` (`entryRefs`), `TaskSetArticle` (`orderTasks` atom), `CreateProjectPanel` (`sorted`), `OutlineArticle` (`resolveLinkLabel` map)                        | `useMemo` / `Atom.make`                                                    | (b) derived typed export (module state column 1)                                                                                          |
| 9   | Operation dispatch                     | `TaskSetArticle` (CRUD), `QuickEntryDialog`, `ProjectArticle` (Layout/Space/Assistant ops)                                                                       | `useOperationInvoker().invokePromise(Op, payload, { spaceId })`            | (a) `on-*` — the template's native write; cross-module keys → proposal                                                                    |
| 10  | Inline ECHO mutation                   | `Journal` (`handleCreateEntry`), `OutlineArticle` (`TaskSet.addTask`, `TaskForm` save), `ProjectArticle` (header/artifact writes), `TaskSetArticle` (`moveTask`) | `Obj.update` in a callback                                                 | (a) after promotion to operations (`R-3`); the promotion is per-site work                                                                 |
| 11  | Operation round-trip (use the result)  | `ProjectArticle` (`handleAddArtifact`, `createChat` 3-op sequence)                                                                                               | `await invokePromise(…)` then act on `data`                                | (b) composed operations — one key whose handler sequences; result-consumption needs the payload contract (DESIGN open question 5 remnant) |
| 12  | Dialog open/close                      | `QuickEntryDialog` (`LayoutOperation.UpdateDialog`), `ProjectArticle` (`OpenObjectForm`)                                                                         | operation dispatch — already stateless in the container                    | (a) operation writing app-level published state                                                                                           |
| 13  | Reset-by-remount                       | `QuickEntryDialog` (`formKey`)                                                                                                                                   | `useState` counter as React `key`                                          | (b) machine transition re-seeding a slot (instance lifecycle, open question 4)                                                            |
| 14  | Imperative controller                  | `JournalArticle` (`CalendarController`), `OutlineArticle`/`Journal` (`OutlineController`), `QuickEntryDialog` (`formSaveRef`), `Outline` (`useImperativeHandle`) | `useRef` + controller interface                                            | needs §2.1-2 command channel; (b) commands as machine events                                                                              |
| 15  | Focus/attention                        | `QuickEntryDialog` (rAF autofocus), `Journal` (`focused` + capture handlers), `TaskSetArticle` (`useAttention`), `Outline` (`autoFocus`, focus-steal timeouts)   | refs, DOM queries, capture listeners, hook                                 | needs §2.1-5; attention read → (b) module state                                                                                           |
| 16  | Keyboard shortcuts                     | `QuickEntryDialog` (`Cmd+Shift+Enter`), `ObjectCard` (Enter/Space), `TaskSetArticle` (`Alt`+arrow, inside TaskList)                                              | `onKeyDown` handlers                                                       | needs §2.1-5 (`on-key-*` → operation); component-internal keys stay renderer duty                                                         |
| 17  | Drag reorder                           | `TaskSetArticle` (`handleMove` via TaskList DnD)                                                                                                                 | component-owned gesture, container-owned drop callback                     | drop → (a) operation; gesture → §2.1-5                                                                                                    |
| 18  | Capability collection                  | `ProjectArticle` (extension providers), `CreateProjectPanel` (templates)                                                                                         | `useCapabilities(Tag)` + `useMemo` flatten                                 | (b) `capability` binding through a module (`use` alias)                                                                                   |
| 19  | Race-guarded async commit              | `Outline` (`convertItemToTask` re-check after await), `OutlineArticle` (effect clearing selection before hand-off)                                               | re-validate state after `await`; effect ordering                           | (b) machine guards — the transition re-checks its predicate at dispatch                                                                   |

**Optimistic overlay** (Phase 7 spike, landed): idioms 8 + 9 + 17 now compose through
`Optimistic.make(source)` (`@dxos/app-framework`) — the container reads one atom emitting the
source rows with ordered overlay entries applied, and `useOptimisticOperation` registers an entry
on dispatch that retires on the first source emission after the operation settles (dropping
immediately on failure). This is the optimistic contract that idiom 5's async bindings will also need
once the `ref`/`query` construct exists. Piloted in `TaskSetArticle.useSetTasks`/`handleMove`.

Cross-cutting, not numbered: **translations** (`useTranslation` in all ten units — a grammar
construct, §2.1-4, not a state idiom) and **stale-closure refs** (`Outline.reportConvertible`,
`QuickEntryDialog.continueRef` — React artifacts that have no equivalent under MVU because
handlers read published state, not closures).

### 3.1 Progressive factoring

The order below extracts idioms into shared hooks/machines without rewriting a container — each
step is useful standing alone, and each converts a §3 row from hand-rolled to declared. It
deliberately mirrors the DESIGN.md landing order (anonymous modules → `var` → module contract):
the hooks are the rung-1/2 forms of what modules later provide. Orthogonal to all six steps,
`@dxos/react-ui`'s `Show`/`Switch` primitives are the conditional-rendering step: a container's
subtree-selecting ternaries and early returns become the grammar's `show`/`fallback`/`switch`/`match`
shapes ahead of any template (piloted in `plugin-tasks`).

1. **Promote inline ECHO writes to operations** (idiom 10). No new machinery — `plugin-tasks`
   already did it for task CRUD (`TaskOperation` verbs in `TaskSetArticle`); `Journal`'s
   create-entry, `TaskSet.moveTask`, and `ProjectArticle`'s header/artifact writes follow the
   same recipe. Precondition for everything else: `R-3` only holds if there is nothing left that
   writes outside an operation.
2. **Extract the query+membership hook** (idioms 6, 7): one `useQueryMembers(db, filter, keys)`
   subsuming the `tick`/`bump` reducer and `subscribeHierarchy` — three containers converge on one
   hook (c), and its signature _is_ the spec for the `query` binding's reactivity semantics (b).
3. **Standardize async ref resolution** (idiom 5): `useResolveRef` already exists; sweep the
   sync `.target` guards (`OutlineCard`) and bespoke `Atom.make` wrappers (`ObjectGallery`) onto
   it. The hook's loading/absent contract becomes the `ref` binding's contract.
4. **Selection and view-switch machines** (idioms 1, 2): register `org.dxos.machine.selection`
   (spike-proven) and a tabs machine; back them with a `useMachineSlot` hook so `TaskSetArticle.selected`
   and `ProjectArticle.tab` move into published state without any template existing yet. First
   point where container state becomes externally addressable (toolbars, tests, undo).
5. **Draft/commit and filter machines** (idioms 3, 4, 13): the form draft (with reset-as-
   transition replacing `formKey`) and the filter-text slot — both proven in stories, both
   currently duplicated per container.
6. **Command channel** (idiom 14): reframe the `*Controller` interfaces as events on the
   machine instances from steps 4–5 (`focus`, `scrollTo`, `save` as machine events dispatching
   operations). This is the last state-shaped idiom; what remains after it —
   surfaces, i18n, keys/focus/DnD triggers, layout aspects (§2.1 items 3–7) — is grammar and
   renderer work, not container refactoring.

Run to completion, steps 1–6 leave every audited container as composition + bindings + operation
keys — exactly the residue a template can express — without any container having been rewritten
against a system that does not exist yet.
