---
# multiple-changesets: sandbox client interruptibility, not the chess-template rewrite
'@dxos/plugin-sandbox': patch
---

Sandbox tool calls now go through Effect `HttpClient` with per-call timeouts and interruptible requests, so a cancelled exec no longer leaves a hung fetch running.
