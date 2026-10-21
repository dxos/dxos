---
'@dxos/plugin-dev-shell': patch
'@dxos/plugin-claude': patch
---

A coding-agent turn from a page served by `vite dev` is covered end to end: a test drives one ACP session from the page's `HelperClient` through the dev shell's agent-host route and plugin-claude's agent server to a real agent process. The agent host takes a `runtime` option for the command that runs agent entries (default `bun`), its `close()` resolves once the agent server has exited, and the page's `HelperClient` forgets an agent server that no longer answers, so the next request starts a new one instead of failing until reload.
