# Task detail — master-detail for task lists

How a task row opens its detail. Ledger items live in [TASKS.md](TASKS.md) under "Tracked 2026-09-23 —
task surfaces"; the deck mechanism is [plugin-deck DESIGN.md §5](../../plugin-deck/DESIGN.md#5-details).

## The behaviour

A task list appears in two hosts: a task set opened on its own (`TaskSetArticle`) and the Tasks tab of
`ProjectArticle`, where the same article is embedded in the `Section` role. Either way, clicking a row
opens the task as the **detail** of the host's plank:

- **Flattened deck (the default)** — the task shows in a companion tab beside the list, labelled
  "Task". The list stays in front of the reader, and reading down it swaps the task in place.
- **Deck not flattened** — the task is a plank beside the list, and the next row replaces it rather
  than adding another plank.
- **Mobile** — the task is pushed onto the stack, replacing the previous task.
- **Meta/ctrl-click** — the task opens as a plank of its own, outside the chain.

The mailbox (message) and the calendar (event) open their rows the same way, and so does a task's
own attachment grid: clicking an attachment card opens the file as the task's detail, which under a
flattened deck moves the task into the main plank. Cards elsewhere, such as a project's or a task's
artifacts, open beside their plank instead, and a card menu's Open always does.

## The pieces

| Piece             | Where                                                           | What it does                                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Row → detail      | `useDetailNavigation` (app-toolkit)                             | Publishes the row as the list's selection and calls `LayoutOperation.Open({ subject, pivotId: <host plank>, disposition: 'detail' })`. The deck decides where the detail goes.   |
| Addressable tasks | `taskSetTasks` (plugin-tasks), `projectTasks` (plugin-projects) | One hidden `Task` node per task under its task set's or project's node, so `…/<host>/<taskId>` resolves. Hidden because the ledger is the list; the nodes exist to be addressed. |
| Detail surface    | `TaskArticle` on `AppSurface.object(Article, Task.Task)`        | The task itself; it renders the same in the companion tab as in a plank.                                                                                                         |
| Tab label         | `AppNode.getTypeLabel` (app-toolkit)                            | The deck names the detail tab from the detail node's type ("Task", "Message", "Event"), so no list configures it.                                                                |
| Keyboard          | `useArticleKeyboardNavigation({ articleId, items, onSelect })`  | Arrow keys read down the list through the same handler.                                                                                                                          |

Nothing is declared on `Project`, `TaskSet` or `Task`: the call says the open is a detail, and the
deck remembers which plank's detail it is.

## Not done

- **Retire the `TaskList.Edit` strip** — it is `createOnly` (the article is the editor, so a selected
  row must not turn the add row into one). Removing it needs creation somewhere else: an inline new row,
  or a toolbar action that creates the task and opens it (the mail draft pattern).
