---
'@dxos/react-ui-task': minor
'@dxos/plugin-registry': minor
---

`LoadPlugin` accepts `enable: false` to load a plugin without turning it on, and the chat's plugin prompt now leaves an agent-built plugin off until it is enabled in Plugins; a plugin loaded after startup opens its detail page without a reload. Coding (Dev) contributes a Composer Plugin project template with one parent task over four subtasks. Assigning a task to the agent now hands over its subtasks too. `TaskList.Viewport` takes an optional `rows` prop that caps it at a whole number of rows, the chat's activity line truncates instead of wrapping, and `@dxos/react-ui-experimental` adds a `Countdown` film-leader component.
