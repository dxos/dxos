---
'@dxos/app-toolkit': minor
'@dxos/plugin-review': patch
---

The comment agent's reply shows in the comment thread again. `AppCapabilities.CommentAgentRunner.run` now returns the text of the turn's final reply (or `undefined` when there is none), and the review plugin posts it in the agent's name; a runner that appended its own reply to the thread's feed should return the text instead.
