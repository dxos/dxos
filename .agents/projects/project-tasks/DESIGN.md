# Project Tasks — Design

Agent delegation and task management over durable tasks: the conversation's
working surface is a `TaskSet` — the owning project's ledger for a project
chat, the chat's own lazily created set otherwise. Delegation assigns a
durable `Task` to an agent; the supervisor's reconcile loop spawns a sub-agent
per ready task (dependencies done), marks it started at spawn, and records
done/failed on exit — there is no separate markdown mirror to reconcile.

## Findings

### Anthropic tool-schema validation (2026-08-25)

The Anthropic API rejects tool `input_schema`s containing an empty `{}` or
typeless subschema ("Empty schema that accepts any JSON value is not
supported" / "Schema type is missing"). Two layers conspired to produce one:

1. `routineOutputSchema` returned `Schema.Any` for a routine with undeclared
   output (`Instructions.make` defaults `output` to `Schema.Void`), and
   `Schema.Any` serializes to `{}`. Every delegated sub-agent takes this path —
   the delegation strategy synthesizes Instructions with no output — so every
   live delegation died at the sub-agent's first model call.
2. Replacing `Any` with a concrete union was not sufficient: a _static_
   `Tool.make` is serialized through the provider's structured-output
   transformer (`toCodecAnthropic`), which rewrites `Record` and
   `ObjectKeyword` members into "[key, value] pairs" encodings whose value
   member is again a typeless `{description: 'JSON value'}` node.

Resolution: `completeJob` is a `Tool.dynamic` — a dynamic tool's JSON schema
reaches the provider verbatim (`Tool.getJsonSchema` returns it before any
transformer runs), and the handler decodes the unvalidated input against the
same untransformed schema. This is the same contract `projectFunctionToTool`
already keeps for operation tools, and for the same reason (its comment
documents the advertised-vs-validated divergence).

Testing note: a `'{}'` substring check on the serialized schema is too weak —
the transformer's typeless nodes carry annotations. The regression test walks
every node and requires one of `type | anyOf | oneOf | enum | const | $ref`.

### Failure fold-back

`onComplete` posted `Cause.pretty(exit.cause)` — including stack traces — as an
assistant message. The conversation now gets `Cause.prettyErrors(...).message`
joined; the full pretty cause stays in `log.warn`. AI-service failures arrive
as defects (`Layer.orDie`), so the message extraction must handle defects, which
`prettyErrors` does.

### Storybook coverage map (2026-08-25)

- Delegation demos: `Chat.stories.tsx` `WithSubAgents` (live), `WithSubAgentsTest1`
  (live play, out of CI), `WithSubAgentsTest2` (scripted, in CI, asserts the
  checklist promotion loop); `TaskList` `WithDelegatedAgent`; `TracePanel`
  `WithSubAgentFixture` (captured live trace).
- TaskSet demos: `TaskSetArticle` `Default`/`Behavior`; `ProjectArticle`
  `Default`/`Sections`/`Updates`.
- Gap: no story renders the durable TaskSet beside a delegating chat; the
  delegation stories assert against the markdown checklist (Outline) only.

## Open questions

1. Should the joined story live in stories-assistant (chat + TaskSetArticle
   surface) or plugin-projects (ProjectArticle with a live chat)?
2. Promote-task verb shape — a `TaskOperation` the agent can call outside
   delegation, or extend `DelegateTask` with an assignee-less mode?

## Hierarchical tasks in the list (design)

Renders a task set as the tree it already stores, and lets a reader restructure it by dragging.
Nothing about the model changes: `Task.parentTask` is the hierarchy and `TaskSet.tasks` is the
order, both already written by the verbs. What is missing is a renderer that walks the tree, a drop
target that can express _where_ in it, and one verb that can move a task and re-parent it at once.

### The invariant the list relies on

`TaskSet.tasks` is flat and holds every task, sub-tasks included, and `Task.parentTask` names the
parent (`TaskSet.rootTasks`/`subTasks` derive the tree from the two). The array is **not** required
to be a pre-order traversal, and this design deliberately keeps it that way: array order decides
**sibling order only**, and the tree walk supplies the rest. A parent therefore moves without
dragging its subtree's array entries along with it, and a concurrent peer that reorders one sibling
cannot corrupt another branch.

The consequence to accept: array position and visual position diverge (a child may sit before its
parent in the array). Everything that reads order — `ListTasks`, the checklist the agent sees,
ordinals — must go through the same tree walk, or two surfaces will disagree about "task 3".

### Rendering

`TaskList.Content` grows a `hierarchical` prop. When set, it walks `rootTasks` → `subTasks` in array
order instead of filtering into status groups (the two are mutually exclusive: a tree that is also
regrouped by status is no longer a tree). Each row carries:

- `depth`, applied as inline-start padding on the title cell only, so the status control and the
  trailing cells stay in their subgrid columns and the rows keep one geometry.
- a disclosure toggle at the head of the title cell when the task has children (**implemented
  there, not in the ordinal gutter**: the gutter only exists when `showOrdinals` is set, and
  hierarchy has to work either way; at the head of the title cell the toggle also indents with the
  row, which is what makes the depth legible). Ordinals stay flat in their own gutter.
- `aria-level`, `aria-expanded`, and `aria-setsize`/`aria-posinset`, which is what makes the
  listbox's roving focus legible to a screen reader once rows nest.

**Ordinals** stay flat — position in the set, not `1.2.1`. The ordinal exists so a person and the
agent can name a task ("run 3"), and a stable per-task number survives moves and collapses, whereas
a path renumbers a whole branch every time anything above it changes. Collapsed rows keep their
numbers; the numbers simply skip.

**Collapse state** is per viewer and per list, not stored on the object: two people looking at the
same project have no reason to share it, and a collapsed branch is not a property of the work. It
lives in `TaskList.Root` state, keyed by task id, with the host free to lift it.

### Drag and drop — reuse `react-ui-list`, do not rebuild

`react-ui-list` already implements hierarchical drag-and-drop, and `react-ui-task` already depends
on it (its rows are `Listbox`). Rebuilding this on `react-ui-dnd` would be a second implementation
of a solved problem, and the two would drift.

Reused as-is:

- **The hitbox and its instructions.** `TreeItem` drives `attachInstruction`
  (`@atlaskit/pragmatic-drag-and-drop-hitbox`), which yields `reorder-above` / `reorder-below` /
  `make-child` from the pointer's position in the row — the three intents a tree needs, with the
  band geometry already tuned.
- **`TreeDropIndicator`** for the insertion line, so a task list looks like every other tree here.
- **`useListDisclosure`** for open/closed state (controlled or uncontrolled), rather than a private
  `Set` in `TaskList.Root`.
- **`paddingIndentation`** for depth, so indentation matches the navtree pixel for pixel.

`NavTreeContainer` is the worked example of the drop side: extract the instruction, compare source
and target parents, and map `make-child` / `reorder-*` onto a rearrange or a re-parent.

**Not reused: `TreeModel`.** It is an atom-family interface (`item`, `itemOpen`, `itemCurrent`,
`itemProps`, `childIds`), and `Tree` renders through `Treegrid` rows with a `renderColumns` hook.
`TaskList`'s row is the component's substance — a six-column subgrid carrying the status control,
ordinal, assignee, priority tags, delete affordance, and a markdown description on its own row —
and its rows are listbox options, which is what gives selection and roving focus. Adopting `Tree`
wholesale would mean re-expressing all of that as treegrid columns plus an atom adapter over the
task set (navtree's is 124 lines), and trading `role=option` selection for treegrid semantics. The
row stays; only the tree mechanics come across.

One deliberate inconsistency to accept: task rows keep `role=option` while the navtree uses
`role=treegrid`, so a screen reader announces them differently. `aria-level` / `aria-expanded` /
`aria-posinset` on the option rows is what keeps the nesting legible.

A drag that dwells over a collapsed parent expands it after ~600ms, so a branch can be entered
mid-drag — the settle-delay idea the board uses to stop tiles scattering under a moving cursor.

Rejected drops, decided in `canDrop`/`blockInstruction` so the cursor says no rather than the
drop silently failing:

- a task onto itself or onto any of its own descendants (the cycle `UpdateTask` already rejects);
- a task from another set — cross-set moves are a different operation (membership changes hands),
  not a reorder;
- any drop while the row is being edited.

**Keyboard parity is required, not optional.** A tree that can only be restructured by dragging is
unusable for anyone who does not drag.

**Implemented as `Alt`+arrow throughout, not the outliner's `Tab` / `Shift-Tab`.** `Alt-ArrowRight`
/ `Alt-ArrowLeft` indent and outdent (making the task a child of its previous sibling, or the next
sibling of its parent); `Alt-ArrowUp` / `Alt-ArrowDown` move within the current parent. The outliner
can claim `Tab` because its row is a text editor with no other use for it; a task row is a listbox
option, and consuming `Tab` there would remove the only way to move focus out of the list — an
accessibility regression traded for muscle memory. One modifier family covers all four moves
instead.

### The verb gap

`UpdateTask` re-parents (and is the only writer allowed to, since it rejects cycles and cross-set
parents) and `MoveTask` reorders against a `before` anchor. A drop is both at once, and two
invocations are two undo entries and a window where the tree is briefly wrong — a task re-parented
but not yet positioned renders at the end of its new parent, jumping as the second call lands.

So: **`MoveTask` gains an optional `parentTask`** (`null` promotes to root, matching `UpdateTask`'s
convention), and performs the re-parent and the reposition in one mutation, rejecting the same
cycles `UpdateTask` does. The list then calls exactly one verb per drop, and the agent gets the same
capability for free — "move task 4 under task 2" stops being two steps it can half-finish.

### Testing

Drops cannot be driven synthetically: pragmatic-drag-and-drop uses native HTML5 drag events, which
Playwright's synthetic dispatch does not produce. So the split is:

- **Unit** — the placement calculation (`(source, target, instruction) → { parentTask, before }`) is a pure
  function tested directly, including every rejected case. This is where the real logic lives, and
  it is the part a regression would break. (`hierarchy.ts` / `hierarchy.test.ts`, 18 tests: the
  walk, the three drop intents, both keyboard moves, and every rejection.)
- **Story** — a `Hierarchical` story renders a seeded three-level set; play asserts the walk
  (`aria-level`, order, disclosure state) and drives **keyboard** restructuring, which is fully
  synthesizable and exercises the same placement function and the same verb.
- **Manual** — one numbered script for the drag gestures themselves, with the row's `[draggable]`
  attributes and an `onDrop` log line as the checkable evidence.

### Deferred

- Cross-set drags (a task dragged into another project's list) — a membership transfer rather than a
  reorder, and the one case that may still want `react-ui-dnd`'s `onTake` contract.
- Unifying the task row onto `Treegrid` so tasks and the navtree share one row substrate. Worth
  revisiting if a third tree surface appears; not worth re-expressing this row for two.
- Multi-select drag.
- Auto-scroll while dragging near the viewport edge.

### What shipped (2026-08-26)

- **`MoveTask` takes an optional `parentTask`** and performs the re-parent and the reposition in one
  mutation, rejecting the same cycles and cross-set parents `UpdateTask` does — the validation and
  the parent-edge write moved to `task-set-membership` so both verbs cannot drift. The parent is
  resolved before either write, so a rejected drop leaves the order untouched.
- **`TaskList` gains `hierarchical`, `onTaskMove`, and `collapsed`/`onCollapsedChange`.** The
  disclosure set holds COLLAPSED ids, not expanded ones: a branch is open by default, and tracking
  the expanded set would hide a task's first sub-task at the moment adding it made its parent a
  branch. `useListDisclosure` (multi) owns the controlled/uncontrolled state machine; its
  trigger/panel ids are unused, because a sub-task is a sibling row in the same grid rather than a
  region `aria-controls` could point at.
- **`Listbox.Item` gained `onKeyDown`**, composed ahead of its own Enter/Space activation so a
  consumer binding can claim the event.
- **`TaskSetArticle` renders hierarchically** and calls `MoveTask` once per gesture.
- Not yet done: the manual drag script, and the ProjectArticle Tasks tab inherits the tree through
  `TaskSetArticle` but has no story of its own asserting it.

### Review round (#12787)

One real defect, found by review rather than by the suites: `applyParentTask` skipped
`Obj.setParent` when neither a new parent nor a task set was available, so
`UpdateTask({ parentTask: null })` on a task belonging to no set cleared the ref but left the ECHO
parent edge pointing at its former parent — which would then cascade-delete the promoted task. The
edge is now written unconditionally, `undefined` included.

Worth remembering about the test: the obvious version of it passes under the buggy code, because a
task still in a set has the set to fall back to. Only a task outside any set exercises the skipped
write. Confirmed by reverting the fix and watching the test fail.

`Check / boot-budget` failed once and passed on re-run with no change: measured locally twice at 22
preload entries / 4.23 MB against a 25 / 4.45 MB budget, both before and after merging main, and
main's own run was green. Nothing in this diff is boot-reachable — `plugin-assistant` reaches
`react-ui-task` only through its `/translations` subpath, and the list surfaces are lazy.

## Object actions: one way for a plugin to put a menu item on another plugin's object

_Designed 2026-08-30. Supersedes the ad-hoc `MailboxAction` / `SenderAction` pair._

### The precedent, and what is wrong with it

plugin-inbox already lets other plugins inject menu items, and does it **twice**:

- `InboxCapabilities.MailboxAction` — a mailbox-scoped item on the article toolbar;
  `createInvocation(mailbox)` returns ONE `{ operation, input }`. plugin-brain contributes `Analyze`.
- `InboxCapabilities.SenderAction` — a sender-scoped item on the per-message menu;
  `createInvocations(actor)` returns a LIST, and an **empty list means "does not apply"**, which is
  how the item is filtered per subject. plugin-crm contributes research.

The two are the same idea with two spellings. Only the second can express "not applicable here", and
only the second composes. Both share the constraint that matters: the contributed value is **plain
data**, and the operation comes back from a closure — holding an `Operation.Definition` on the
capability value makes the capability atom read recurse.

A third mechanism exists for objects that have an app-graph node: contributions land on the node and
`graphActions(graph, get, nodeId, { filter: isToolbarAction })` folds them in. That is the right tool
when the subject already has a node (a mailbox does). **A task does not** — plugin-tasks' graph
builder contributes only a root action, and a task lives inside a `TaskSet`, not a collection — so
the graph route would mean inventing nodes per task before any of this could work.

### The mechanism

One generic shape, `ObjectAction<T>` in `@dxos/app-toolkit/ObjectAction`, replacing both:

```ts
export type ObjectAction<T> = {
  id: string;
  label: string;
  icon?: string;
  /** Invocations to run, in order. EMPTY means the action does not apply to this subject. */
  createInvocations: (subject: T) => { operation: Operation.Definition.Any; input: unknown }[];
};
```

Each plugin declares its own capability over that shape, so the subject type stays checked and the
capability key stays owned by the plugin that defines the surface:

```ts
export const TaskAction = Capability.make<ObjectAction<Task.Task>>()(`${meta.profile.key}.capability.taskAction`);
```

Filtering is the empty list, not a separate predicate: one closure decides applicability and what to
run, so the two cannot disagree.

### Rendering: `react-ui-task` stays presentation-only

`react-ui-task` must not learn about capabilities, operations or the app graph. `TaskList` therefore
takes plain descriptors and hands back an id:

```ts
getTaskActions?: (task: Task.Task) => readonly TaskItemAction[];   // { id, label, icon?, disabled? }
onTaskAction?: (task: Task.Task, actionId: string) => void;
```

`onTaskDelete` is **removed**: delete becomes an ordinary action the container supplies, so the row
has one affordance to render rather than a special case plus a list.

The row renders by count — nothing for none, a plain icon button for one, a `DropdownMenu` for more.
`DropdownMenu` comes from `@dxos/react-ui`, which the package already depends on; using
`@dxos/react-ui-menu` here would pull `app-graph`, `graph` and `keyboard` into a leaf UI package for
one overflow menu.

### Wiring

- `TaskSetArticle` / `ProjectArticle` resolve `TaskAction` with `useCapabilities`, build the row's
  descriptor list (its own `delete` plus every contributed action whose `createInvocations` is
  non-empty for that task), and dispatch the chosen id through the operation invoker.
- plugin-projects contributes `create-chat`: a new `Chat`, companion-linked to the project, with the
  task placed in `chat.tasks`.

### Open question — `Chat.tasks` re-parents

`Chat.tasks` carries `Annotation.SetParent.set(true)`, so putting an **existing** task into a chat
moves its ECHO parent edge from the `TaskSet` to the `Chat`. The task would leave the set's ownership
and follow the chat's cascade delete. Three ways out, decision pending: reference the task without
re-parenting (needs a non-`SetParent` field), copy it, or accept the move as the meaning of
"delegate this task to a chat".
