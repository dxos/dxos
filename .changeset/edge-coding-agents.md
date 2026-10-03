---
# multiple-changesets: the other entries are main's, carried into this stacked PR by merging main into a base that predates them
'@dxos/plugin-code': minor
'@dxos/plugin-claude': minor
---

A chat can run Claude Code on EDGE instead of on this computer. `plugin-code` adds `EdgeAgent.make`, which runs the chat's turns on EDGE's coding-agent process in a sandbox container. The session keeps working with no client connected. When the agent dies or stops making progress, EDGE restarts the container and resumes the turn.

`plugin-claude` registers it as "Claude Code (cloud)". Each turn lends the process the space's Anthropic token, so the user's credential never enters the container. The session starts in Claude Code's `auto` mode and runs unattended by default: the agent is told never to ask questions, and a permission request is denied on the spot, so the agent skips that step and carries on.

The Code plugin's coding-agent permission setting gains `bypassPermissions`, which never asks and runs everything. It applies to Claude Code on this computer and to a new cloud chat, which keeps the mode it was spawned with. In the cloud sandbox, which runs as root, the agent is told it is sandboxed so that the mode is honoured.

`claude-code.e2e.test.ts` drives the real agent helper, Claude Code's ACP adapter and `claude` against the API. It is opt-in: set `DX_E2E_CLAUDE=1` with `DX_ANTHROPIC_API_KEY`.
