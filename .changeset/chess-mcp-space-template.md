---
'@dxos/plugin-debug': minor
---

The runnable space template now builds a chess engine exposed as an MCP server on one Cloudflare Worker, so the run it describes ends inside Composer — a chat in the same space asking the deployed Worker for a move — and nothing in the middle of it needs an account: DeepSeek through the edge rather than an Anthropic key, the assistant coding in a remote sandbox rather than delegating to a managed agent, `wrangler deploy --temporary` rather than a Cloudflare login, and GitHub last. **Breaking:** `@dxos/plugin-debug/sample` no longer exports `ChatroomSpace`; the replacement is `StockfishSpace`, with no compatibility re-export.
