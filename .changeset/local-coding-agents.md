---
'@dxos/agent-runtime': minor
'@dxos/ai': minor
'@dxos/app-toolkit': minor
'@dxos/plugin-assistant': minor
'@dxos/plugin-projects': minor
'@dxos/plugin-tasks': minor
'@dxos/react-ui-assistant': minor
'@dxos/types': minor
---

Chats can run on a coding agent other than Composer's own. `SessionConfig` gains `harness` (which agent runs the chat) and `host` (the device that runs it). Plugins register agents through `AssistantCapabilities.Agent`, and the agent service picks the turn engine per chat from it. `MakeTurnProducerOptions` now includes the `chat`.

`plugin-code` adds the desktop app's agent helper and an ACP turn engine. It streams the agent's transcript into the chat, keeps the agent's session warm between turns and resumes it after a restart. `plugin-claude` uses it to offer Claude Code on the user's machine.

An agent's permission requests arrive as a `request` content block (`ContentBlock.Request`). The chat renders it as a card, and the answer goes back through `AssistantOperation.RespondToRequest`.

`ProjectOperation.DelegateTaskToChat` takes an optional `harness`. Without one, it uses the new `defaultAgent` assistant setting while that agent is available, and Composer otherwise. A task's menu lists an "Assign to" entry per registered agent and disables those that cannot run on this device. To support this, `ObjectAction` gains `group` and `unavailable`.

A project overview has a settings slot, `ProjectView.Settings`, where other plugins add settings. `plugin-code` uses it for the project's repository folder on this device, and a delegated chat works in its own git worktree of that folder.

A coding agent gets Composer's operations as the `composer` MCP server, scoped to its chat's space. The page serves the same surface as `dx mcp serve`, and the agent helper relays the agent's requests to it.

`CodeAgent.make` takes `sessionMeta`, agent-specific ACP session options built from the Composer tools on offer. Claude Code uses it to call Composer's read-only tools without asking each time. The Claude plugin now depends on the Code plugin, which runs the agent helper.
