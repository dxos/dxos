---
'@dxos/agent-code-mode': minor
---

The Effect dialect's system prompt no longer lists every bound operation with its input and output: it tells the model to search `DOCS['catalog/operations.md']`, which holds the same list, and the Skill Manager's `queryOperations` for skills not enabled yet. Operations bound mid-turn are announced by name and DXN. Every `eval` result the model reads, failed or not, now ends with a reminder that the program's state is gone, exported as `STATE_TRAILER`.
