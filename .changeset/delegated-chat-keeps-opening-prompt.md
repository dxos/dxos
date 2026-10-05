---
'@dxos/plugin-projects': patch
---

A chat opened by assigning a project's tasks to the agent now starts with the project's instructions,
so showing the Assistant companion for that project no longer restarts the agent and drops the opening
prompt. `AgentService` logs the old and new configuration whenever it restarts a live agent.
