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
- a disclosure toggle in the ordinal gutter when the task has children, replacing the ordinal for
  that row; a leaf keeps its ordinal.
- `aria-level`, `aria-expanded`, and `aria-setsize`/`aria-posinset`, which is what makes the
  listbox's roving focus legible to a screen reader once rows nest.

**Ordinals** stay flat — position in the set, not `1.2.1`. The ordinal exists so a person and the
agent can name a task ("run 3"), and a stable per-task number survives moves and collapses, whereas
a path renumbers a whole branch every time anything above it changes. Collapsed rows keep their
numbers; the numbers simply skip.

**Collapse state** is per viewer and per list, not stored on the object: two people looking at the
same project have no reason to share it, and a collapsed branch is not a property of the work. It
lives in `TaskList.Root` state, keyed by task id, with the host free to lift it.

### Drag and drop

Built on `@dxos/react-ui-dnd` (`Dnd.Root` + `useDndRootContext().addContainer`), the same primitive
the board uses, so a task can later be dragged between a list and another surface without a second
mechanism. The list registers one container; each row is a tile whose `location` is the tree
position it currently occupies.

Three drop targets per row, because a tree needs to express three different intents:

| Target   | Zone                   | Result                                             |
| -------- | ---------------------- | -------------------------------------------------- |
| `before` | top quarter of the row | sibling of the row, immediately above it           |
| `after`  | bottom quarter         | sibling of the row, immediately below it           |
| `into`   | middle half            | last child of the row (which expands if collapsed) |

The middle band is the largest because nesting is the gesture that is hard to hit and easy to want;
the sibling bands sit at the edges where a person aims when they mean "between these two". A drag
that dwells over a collapsed parent expands it after ~600ms, so a branch can be entered mid-drag —
the same settle-delay idea the board uses to stop tiles scattering under a moving cursor.

Rejected drops, decided in `canDrop` so the cursor says no rather than the drop silently failing:

- a task onto itself or onto any of its own descendants (the cycle `UpdateTask` already rejects);
- a task from another set — cross-set moves are a different operation (membership changes hands),
  not a reorder;
- any drop while the row is being edited.

**Keyboard parity is required, not optional.** A tree that can only be restructured by dragging is
unusable for anyone who does not drag, and the outliner already taught these keys: `Tab` /
`Shift-Tab` indent and outdent (making the task a child of its previous sibling, or a sibling of its
parent), `Alt-ArrowUp` / `Alt-ArrowDown` move within the current parent. Reusing them means one
muscle memory across the outline and the list.

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

- **Unit** — the placement calculation (`(source, target, zone) → { parentTask, before }`) is a pure
  function tested directly, including every rejected case. This is where the real logic lives, and
  it is the part a regression would break.
- **Story** — a `Hierarchical` story renders a seeded three-level set; play asserts the walk
  (`aria-level`, order, disclosure state) and drives **keyboard** restructuring, which is fully
  synthesizable and exercises the same placement function and the same verb.
- **Manual** — one numbered script for the drag gestures themselves, with the row's `[draggable]`
  attributes and an `onDrop` log line as the checkable evidence.

### Deferred

- Cross-set drags (a task dragged into another project's list) — a membership transfer, and the
  `onTake` half of the DnD contract exists for exactly that.
- Multi-select drag.
- Auto-scroll while dragging near the viewport edge.
