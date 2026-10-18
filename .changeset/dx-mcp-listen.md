---
'@dxos/cli': minor
---

Add `dx mcp listen`, which holds a 2026-07-28 `subscriptions/listen` stream open on an MCP server and prints one JSON line per notification (`--resource <uri>` for resource updates, read back unless `--uri-only`; `--list-changed` for list changes). Status goes to stderr, so every stdout line is an event.

It exists so an MCP server's events can wake a coding agent: run it under Claude Code's `Monitor` tool and each line starts a turn. Claude Code has no native path for this on a 2026-07-28 connection — it drops `claude/channel` notifications there and never shows `notifications/resources/updated` to the model.
