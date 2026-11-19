---
'@dxos/types': minor
'@dxos/plugin-projects': minor
'@dxos/plugin-claude': minor
---

A project can carry a setup script for its cloud coding agent's sandbox, so the toolchain its repositories need no longer lives in the shared sandbox image. `projects-update-repositories` takes `setupScript` (and returns it); a cloud coding agent started for a chat in the project sends it with the spawn as the `org.dxos.coding-agent.setup-script` annotation, and EDGE runs it once per container after the checkouts and before the agent starts.
