---
'@dxos/mcp-server': minor
---

`invokeOperation` now refuses an operation whose skills the session has not loaded, failing with `skill_not_loaded` and naming the `loadSkill` call that unlocks it. `loadSkill` records each skill it loads for the session.

Breaking: `McpServer.invoke` takes a required fourth argument, the session's `LoadedSkills`. `McpServer.loadSkillByName` takes an optional third argument, the set it records a loaded skill into.
