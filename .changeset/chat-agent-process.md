---
'@dxos/compute': minor
'@dxos/plugin-assistant': minor
---

A chat can name the durable process that runs it in `session.process`: plugins contribute agent processes through `AssistantCapabilities.AgentProcess`, and `AgentService` spawns the one a chat names, falling back to the assistant's own. Adds the `Subprocess` service (`@dxos/compute/Subprocess`, with a Node.js implementation at `@dxos/compute-runtime/node-subprocess`), which the Claude plugin's Claude Code process uses to start the agent.
