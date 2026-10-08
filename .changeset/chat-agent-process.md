---
'@dxos/compute': minor
'@dxos/compute-runtime': minor
'@dxos/plugin-claude': minor
'@dxos/plugin-code': minor
'@dxos/plugin-projects': minor
---

A chat can run on Claude Code on this computer or on EDGE.

A chat names the durable process that runs it in `session.process`. Plugins contribute agent processes through `AssistantCapabilities.AgentProcess`, and `AgentService` spawns the one a chat names, falling back to the assistant's own. The Claude plugin's Claude Code process starts the agent through the new `ShellService` (`@dxos/compute/ShellService`), which runs operating-system processes and bash scripts for a compute process. Each process gets its own instance, and every child it started ends when that process ends. The Node.js implementation is `@dxos/compute-runtime/node-shell`.

"Claude Code (cloud)", built on plugin-code's new `EdgeAgent.make`, runs a chat's turns on EDGE's coding-agent process in a sandbox container. The session keeps working with no client connected, and EDGE restarts the container and resumes the turn when the agent dies or stalls. Each turn lends the process the user's credential, so the credential never enters the container. The cloud session runs unattended by default: a permission request is denied on the spot, and the agent skips that step and carries on.

A new **Claude Code** connector stores a Claude subscription token: open a terminal, run `claude setup-token`, and paste the token it prints. The token is kept apart from the Anthropic API key. Claude Code on this computer receives it as `CLAUDE_CODE_OAUTH_TOKEN`, and the cloud harness lends it in preference to the API key.

A project lists the GitHub repositories its cloud sessions work on (`Project.repositories`), set in the project's header next to its name. The sandbox checks out the project's `repo` and each listed repository before the agent starts. Each turn lends the space's GitHub token to EDGE, resolving it through EDGE when EDGE holds it, and EDGE proxies the sandbox's git calls with it, so the token never enters the container either. The project folder setting applies only to Claude Code on this computer.

The Code plugin's coding-agent permission setting gains `bypassPermissions`, which never asks and runs everything.
