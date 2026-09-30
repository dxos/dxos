---
'@dxos/types': minor
'@dxos/react-ui-task': minor
'@dxos/plugin-assistant': minor
'@dxos/plugin-tasks': minor
'@dxos/plugin-projects': minor
---

Questions an agent asks about a task now live in the task's history instead of in a separate
`Question` object, which is removed. `Task.HistoryEntry` is a union keyed on `event` — `created`,
`updated`, `question` and `answer`. Question and answer entries carry an `id`, so an answer names the question
it answers by `questionId`; a change entry's `id` is optional, so history logged before ids still loads. `Task.ask`, `Task.answer`, `Task.getQuestions` and
`Task.getPendingQuestions` read and write the exchange.

`TaskList` renders each task's questions under its title (`showQuestions`, on by default) and answers
them through `onQuestionAnswer`; the new `TaskQuestion` component draws one question. `AnswerQuestion`
now takes the task and the question entry's id.

`TaskOperation.AskQuestion` files a question on a task by its ref and blocks the task, with no chat
needed, and the project skill lists it, so MCP clients get it as `tasks-ask-question` along with
instructions on asking and reading the answer back. `TaskOperation.AnswerQuestion` records an
answer; the task set view answers through it.
