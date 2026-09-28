---
'@dxos/react-ui-task': minor
'@dxos/plugin-registry': minor
'@dxos/plugin-map': minor
'@dxos/react-ui-geo': minor
---

`LoadPlugin` accepts `enable: false` to load a plugin without turning it on, and the chat's plugin prompt now leaves an agent-built plugin off until it is enabled in Plugins; a plugin loaded after startup opens its detail page without a reload. Coding (Dev) contributes a Composer Plugin project template with one parent task over four subtasks, in which an agent builds a World Clock plugin. `@dxos/react-ui-geo` adds a `WorldMap` component (markers with a highlighted selection, a toggle between the flat equirectangular map and a globe that turns about its axis to the selection), the `equirectangular` projection with a `contain`/`cover` fit, `flyTo`'s `path: 'axis'`, and a `timezones` table of IANA zone positions on its `data` subpath; plugin-map renders it for the `MapRole.World` role, highlighting whatever is selected in the requester's `subject`. Assigning a task to the agent now hands over its subtasks too. `TaskList.Viewport` takes an optional `rows` prop that caps it at a whole number of rows, the chat's activity line truncates instead of wrapping, and `@dxos/react-ui-experimental` adds a `Countdown` film-leader component.
