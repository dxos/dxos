---
'@dxos/compute': minor
'@dxos/plugin-claude': minor
---

A chat can run on Claude Code on this computer or on EDGE.

A chat names the durable process that runs it in `session.process`. Plugins contribute agent processes through `AssistantCapabilities.AgentProcess`, and `AgentService` spawns the one a chat names, falling back to the assistant's own. The Claude plugin's Claude Code process starts the agent through the new `Subprocess` service (`@dxos/compute/Subprocess`; the Node.js implementation is `@dxos/compute-runtime/node-subprocess`), which ends the agent when the process ends.

"Claude Code (cloud)", built on plugin-code's new `EdgeAgent.make`, runs a chat's turns on EDGE's coding-agent process in a sandbox container. The session keeps working with no client connected, and EDGE restarts the container and resumes the turn when the agent dies or stalls. Each turn lends the process the user's credential, so the credential never enters the container. The cloud session runs unattended by default: a permission request is denied on the spot, and the agent skips that step and carries on.

A new **Claude Code** connector stores a Claude subscription token: open a terminal, run `claude setup-token`, and paste the token it prints. The token is kept apart from the Anthropic API key. Claude Code on this computer receives it as `CLAUDE_CODE_OAUTH_TOKEN`, and the cloud harness lends it in preference to the API key.

The Code plugin's coding-agent permission setting gains `bypassPermissions`, which never asks and runs everything.
