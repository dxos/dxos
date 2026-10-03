---
'@dxos/plugin-code': minor
'@dxos/plugin-claude': minor
---

A chat can run Claude Code on EDGE instead of on this computer. `plugin-code` adds `EdgeAgent.make`, which runs the chat's turns on EDGE's coding-agent process in a sandbox container. The session keeps working with no client connected. When the agent dies or stops making progress, EDGE restarts the container and resumes the turn.

`plugin-claude` registers it as "Claude Code (cloud)". Each turn lends the process the space's Anthropic token, so the user's credential never enters the container. The session starts in Claude Code's `auto` mode and runs unattended by default: the agent is told never to ask questions, and a permission request is denied on the spot, so the agent skips that step and carries on.
