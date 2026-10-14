---
'@dxos/plugin-agent': patch
---

- `AgentKnowledge.Browser` (`EntityBrowser`) is composable: its horizontal scroll frame is the root, so a host's `Panel.Body asChild` slots onto it instead of nesting a second panel. Hosts provide the panel; the AgentKnowledge Entities tab already does.
- The email channel's settings lead their toolbar with "Email" beside the connect and disconnect actions, and scroll the form beneath it, so a host without a header of its own can use that toolbar as its top bar.
