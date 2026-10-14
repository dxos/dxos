---
'@dxos/plugin-agent': patch
---

`AgentKnowledge.Browser` (`EntityBrowser`) is composable: its horizontal scroll frame is the root, so a host's `Panel.Body asChild` slots onto it instead of nesting a second panel. Hosts provide the panel; the AgentKnowledge Entities tab already does.
