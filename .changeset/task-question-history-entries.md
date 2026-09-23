---
'@dxos/types': minor
'@dxos/react-ui-task': minor
'@dxos/plugin-assistant': minor
---

Questions an agent asks about a task now live in the task's history instead of in a separate
`Question` object, which is removed. `Task.HistoryEntry` is a union keyed on `event` — `created`,
`updated`, `question` and `answer` — and every entry carries an `id`, so an answer names the question
it answers by `questionId`. `Task.ask`, `Task.answer`, `Task.getQuestions` and
`Task.getPendingQuestions` read and write the exchange.

`TaskList` renders each task's questions under its title (`showQuestions`, on by default) and answers
them through `onQuestionAnswer`; the new `TaskQuestion` component draws one question. `AnswerQuestion`
now takes the task and the question entry's id.
