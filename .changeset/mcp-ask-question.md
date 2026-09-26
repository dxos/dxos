---
'@dxos/assistant-toolkit': patch
'@dxos/plugin-tasks': minor
---

`tasks.askQuestion` takes `remoteSession`, assigning the blocked task to the asking coding-agent session and recording that session as the asker. The chat planning tool's `ask-question` now refuses a blank question instead of filing it.
