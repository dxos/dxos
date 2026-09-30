---
'@dxos/test-utils': minor
---

Add `@dxos/test-utils/claude-agent`: a driver for one long-lived `claude --print`
process in stream-json mode, so a test or eval can send a turn, wait for it to
finish, assert, and send the next one down the same conversation. It moves here
from the CLI's testing directory now that both the CLI's MCP end-to-end test and
the assistant-evals MCP eval drive it.
