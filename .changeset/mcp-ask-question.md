---
'@dxos/assistant-toolkit': patch
'@dxos/plugin-tasks': minor
---

`tasks.askQuestion` takes `remoteSession`, assigning the blocked task to the asking coding-agent session and recording that session as the asker. A `remoteSession` passed without a `title` to `tasks.update` or `tasks.askQuestion` now names a still-untitled session after the task it claims. The chat planning tool's `ask-question` now refuses a blank question instead of filing it.
