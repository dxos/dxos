# Task detail — master-detail for task lists

How a task row opens its detail, and what that replaces. Ledger items live in
[TASKS.md](TASKS.md) under "Tracked 2026-09-23 — task surfaces".

## The problem

`TaskSetArticle` edits the selected task in a `TaskList.Edit` strip pinned to the bottom of the
panel. The strip is both the editor and the create row, so it is always present, it competes with the
list for height, and it can only ever show the few fields it has room for. Embedded as the Tasks tab
of `ProjectArticle` it is worse: the tab already splits with the pipeline chart, so the strip eats
the little height the ledger has left.

A task has more to show than a strip can hold — description, status, assignee, estimate,
dependencies, sub-tasks, history, and the delegation a sub-agent ran against it — and a reader moving
down a list wants each one in the same place rather than a new pane per click.

## The precedent: plugin-inbox

Mail is the same shape (a long list, a detail per row) and Composer already answers it. The answer is
**not** a companion — it is a _level chain of planks_, so the detail is an ordinary plank that the
deck reuses as the reader moves down the list.

| Piece                 | Where                                                                     | What it does                                                                                                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Level chain           | `plugin-inbox/src/types/Mailbox.ts` — `DeckAnnotation.set({ levels: … })` | `mailbox → message → attachment`. A level's key names the plank (`<rootId>/<key>`), so opening at a level **reuses** that plank and closes every level below it.                                                                                        |
| Hidden graph children | `plugin-inbox/src/capabilities/app-graph-builder.ts` — `mailboxMessages`  | One hidden node per message under the mailbox, so `…/mailboxes/<id>/<messageId>` resolves. `url: { key: 'message', kind: 'item', path, minDepth }`; `disposition: 'hidden'` keeps them out of the nav tree.                                             |
| Path helper           | `plugin-inbox/src/paths.ts` — `getFeedObjectPath(parentPath, childId)`    | The child's qualified path, appended as a plain segment (not a linked companion segment).                                                                                                                                                               |
| Detail surface        | `plugin-inbox/src/capabilities/react-surface.ts` — `message`              | `MessageArticle` on `AppSurface.subject(Article, isNonDraftMessage)`, and the same component in the `Section` role.                                                                                                                                     |
| Row → detail          | `MailboxArticle.tsx` — `handleNavigate`                                   | `LayoutOperation.Select` (the row stays current in the list) **plus** `LayoutOperation.Open` with `{ root, level, pivotId, disposition: 'add' }`. Meta/ctrl click drops `root`/`level`, so it opens a plank of its own and keeps what is already there. |
| Keyboard              | `useArticleKeyboardNavigation({ articleId, items, currentId, onSelect })` | Arrow keys read down the list through the same handler, reusing the one plank.                                                                                                                                                                          |
| Create                | toolbar action → `InboxOperation.DraftEmailAndOpen`                       | Creation makes the object and opens its plank; there is no persistent editor strip.                                                                                                                                                                     |

## The design for Project / Tasks

Same six pieces, with one wrinkle mail does not have: a task list appears in **two hosts** — the
standalone `TaskSetArticle` and the Tasks tab of `ProjectArticle`, where it is embedded in the
`Section` role. The deck root differs between them, so the chain is declared on both types:

- `TaskSet` — `levels: [{ key: 'taskSet' }, { key: 'task' }]`.
- `Project` — the existing chain gains a `task` rung, so a row opened from the Tasks tab reuses one
  plank beside the project rather than stacking one per click.

The row handler takes the root from its host (the article's `attendableId`), which is the task set's
node id standalone and the project's inside the tab; nothing else differs between the two.

### Pieces

1. **Chain** — `DeckAnnotation` on `TaskSet` (and the `task` rung on `Project`).
2. **Hidden children** — a `taskSetTasks` connector in `plugin-tasks` (hidden `Task` nodes under a
   `TaskSet` node), and a matching one in `plugin-projects` under `PROJECT_URL` for the project's own
   task set, so a task is addressable by path from either host.
3. **Path helper** — `plugin-tasks/src/paths.ts`, mirroring `getFeedObjectPath`.
4. **`TaskArticle`** — the detail container, registered on `AppSurface.object(Article, Task.Task)`.
   Starts with what `TaskList.Edit` shows (title, description, status, estimate) and grows into the
   fields a strip could never hold.
5. **Row → detail** — `TaskSetArticle` rows invoke `Select` + `Open` at `level: 'task'`; meta-click
   opens its own plank. Keyboard navigation reuses `useArticleKeyboardNavigation`.
6. **Retire the strip** — only once creation has somewhere else to live: either an inline new row in
   the list, or a toolbar action that creates the task and opens its plank (the mail draft pattern).
   Removing the strip before that takes away the only way to type a new task.

### What this is not

- **Not a companion.** A companion is _about_ the subject beside it (assistant, properties, debug). A
  task's detail is the subject itself, reached by reading down its list — which is what a level chain
  is for. The word "companion" in the original request means "detail pane beside the list"; the deck
  spells that as a reused plank.
- **Not a rewrite of `TaskList`.** Selection already exists (`selectable` / `selected` /
  `onTaskSelect`); the row handler is what is missing.
