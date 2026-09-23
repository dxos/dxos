---
'@dxos/types': minor
---

`Task.HistoryEntry` is now a union keyed on `event`: `ChangeEntry` (`created`/`updated`),
`QuestionEntry` (`question`) and `AnswerEntry` (`answer`, naming its question by `questionId`). Every
entry carries an `id`, which `Task.update` stamps. `AnswerOption` moves to `Task`, and the
`Question` object type is deprecated in favour of the question and answer entries.
