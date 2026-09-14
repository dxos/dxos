---
'@dxos/echo': minor
'@dxos/plugin-markdown': minor
---

Let a planning agent ask the user a question and resume on the answer.

An agent working a checklist had two options when it hit something it could not decide: guess, or
stop. `ask-question` is the third. It takes the exact title of a checklist task, files a durable
`Question` on that task as an artifact, and moves the task to `blocked` — so the checklist says what
is waiting and on whom, rather than showing work that nothing is advancing. The question may carry
suggested answers; the surface that renders it always offers a free-form field besides them, since
the point of asking is that the asker did not know.

Answering records the answer on the object and sends the conversation a synthetic prompt naming the
question, which the agent reads back with `get-objects` before continuing. The answer is not quoted
into that prompt: it lives on the object, so the agent sees whatever the reader actually chose,
including a later edit. The task is left `blocked` for the agent to clear — only it knows whether
the answer unblocked anything.

`question.asked` and `question.answered` join the trace alongside the status change, so the stretch
a task spent waiting on a person is visible on the session timeline.
