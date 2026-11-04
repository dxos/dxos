---
'@dxos/compute': minor
---

`tasks.recordSession` now succeeds when the `dxos` Claude plugin's hooks call it through `dx mcp serve`. Before, the skill gate refused every hook call, because a hook cannot send a skill token. The new `Operation.hookInvocable` annotation marks an operation that a harness hook calls, and the MCP server dispatches such an operation without a skill token. A failed MCP tool call now reports its failure code, message and operation key to PostHog, and error tracking groups these failures by tool, operation and code. A call that fails only on its own input (`invalid_request`, `skill_not_loaded`, `space_not_in_context`) still counts as an errored tool call, but it no longer files an exception.
