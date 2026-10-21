---
'@dxos/plugin-claude': minor
'@dxos/plugin-code': minor
'@dxos/plugin-dev-shell': minor
---

Claude Code on this computer runs in Composer served from a Vite dev server, not only in the desktop app. The local coding-agent runtime (the agent entry, the `AgentHelper` host interface, the agent server, worktrees and the project's code folder) moves from plugin-code to plugin-claude, whose Tauri-only module runs it as the `dx-agent` sidecar; plugin-dev-shell hosts the same server in the dev server and contributes an `AgentHelper` over it. plugin-code is the plugin-authoring workbench only, and its coding-agent permission setting is now plugin-claude's.
