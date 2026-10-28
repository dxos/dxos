---
'@dxos/context': patch
'@dxos/plugin-assistant': patch
'@dxos/plugin-devtools': patch
'@dxos/plugin-kanban': patch
'@dxos/plugin-map': patch
'@dxos/react-ui': patch
---

Kanban cards render in card views that request only `cardContent`: the kanban, map, assistant and devtools surface modules now declare every role their surfaces bind. `MediaPlayer` embeds drop the `allow-presentation` sandbox flag on engines that don't support it, so WebKit no longer logs an error per embed. The "large number of dispose callbacks" warning reports six stack frames, enough to reach the code past a helper such as `Event.on`.
