---
'@dxos/ai': minor
'@dxos/assistant': minor
'@dxos/compute': minor
'@dxos/react-ui-list': minor
'@dxos/react-ui-trace': patch
'@dxos/plugin-github': patch
'@dxos/plugin-navtree': patch
'@dxos/devtools': patch
'@dxos/plugin-assistant': patch
'@dxos/plugin-projects': patch
'@dxos/plugin-debug': patch
'@dxos/react-ui': patch
'@dxos/react-ui-task': patch
'@dxos/plugin-file': patch
---

`SessionConfig` (`@dxos/ai`) describes how an AI session runs — for now its model. **Breaking:** `Chat.model` (a ref whose URI was the model DXN) is replaced by `Chat.session: SessionConfig`, and `AgentService.Conversation.model` by `Conversation.session`; a model stored on an existing chat is not carried over, so that chat starts on the default once. `Project.session` sets the default for the sessions a project starts: a chat it creates, or one it delegates tasks to, is seeded from it (`Chat.seedSession`), and a model later picked in the chat stays the chat's own.

`Tree` takes `indentGuides`, drawing Ark's indent guide down each open branch's children (not in windowed trees). **Changed geometry:** each level now indents by one block — 1.5rem, the icon plus a compact `IconButton`'s padding — which is also the width of the toggle column and the icon cell, so a child's toggle is centred under its parent's icon (previously an 8px step). A branch's count badge centres its number. The debug console's `report` command sends the title as the issue body when `--body` is omitted. `SystemIconButton.Clipboard` keeps a visible label through a copy, so a chip naming what it copies no longer changes size. A task's mnemonic chip renders in the monospace face, and a file card fits its image inside the card by default.
