---
'@dxos/echo': patch
---

Refuse an ask-question whose task title two tasks share.

`ask-question` names its task by title, because the title is the only part of a task the person
answering ever sees. Two tasks can carry the same one, and the lookup took whichever came first: the
question would block a task the asker never meant, and the one they did mean would go on reading as
live work while nothing advanced it. The ambiguous case is now refused with the checklist echoed
back, so the agent can retitle and ask again.
