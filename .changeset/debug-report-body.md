---
'@dxos/ai': minor
'@dxos/assistant': minor
'@dxos/compute': minor
'@dxos/react-ui-list': minor
'@dxos/agent-runtime': patch
'@dxos/react-ui-trace': patch
'@dxos/plugin-github': patch
'@dxos/plugin-navtree': patch
'@dxos/devtools': patch
'@dxos/plugin-assistant': patch
'@dxos/plugin-projects': patch
'@dxos/plugin-debug': patch
'@dxos/plugin-registry': patch
'@dxos/plugin-tasks': patch
'@dxos/react-ui': patch
'@dxos/react-ui-task': patch
'@dxos/plugin-file': patch
'@dxos/ui-theme': patch
---

`SessionConfig` (`@dxos/ai`) describes how an AI session runs — for now its model. **Breaking:** `Chat.model` (a ref whose URI was the model DXN) is replaced by `Chat.session: SessionConfig`, and `AgentService.Conversation.model` by `Conversation.session`; a model stored on an existing chat is not carried over, so that chat starts on the default once. `Project.session` sets the default for the sessions a project starts: a chat it creates, or one it delegates tasks to, is seeded from it (`Chat.seedSession`), and a model later picked in the chat stays the chat's own.

`Tree` takes `indentGuides`, a vertical line down each open branch's children under the branch's chevron; a windowed tree draws it as per-row segments. The task list always shows them. **Changed geometry:** every tree indents each level by one block (`TREE_BLOCK`, 1.5rem — the icon plus a compact `IconButton`'s padding), which is also the width of the chevron column and the icon cell, so a child's chevron is centred under its parent's icon (previously an 8px step). A windowed tree now animates disclosure: opened rows fade in, and a close conceals the children before the branch collapses. A branch's count badge centres its number.

The debug console's `report` command sends the title as the issue body when `--body` is omitted. `SystemIconButton.Clipboard` keeps a visible label through a copy, so a chip naming what it copies no longer changes size. A task's mnemonic chip renders in the monospace face, and a file card fits its image inside the card by default. Registry plugin cards carry a shadow, and the neutral surface (neutral tags, callouts, badges) is lighter in light mode.
