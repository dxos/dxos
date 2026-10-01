---
'@dxos/mcp-server': minor
---

`invokeOperation` now refuses an operation whose skills the session has not loaded, failing with `skill_not_loaded` and naming the `loadSkill` call that unlocks it. `loadSkill` records each skill it loads for the session.

A host may supply a `skillLedger` on its `Host` to keep that record in storage its requests share; omitted, the surface keeps it in memory (`McpServer.memorySkillLedger`). The server instructions also ask the agent to rename its own session after a task it picks up.

Breaking: `McpServer.invoke` takes a required fourth argument, the set of loaded skill names. `McpServer.loadSkill` and `McpServer.invokeWithLedger` are the ledger-aware forms a host's own dispatch uses.
