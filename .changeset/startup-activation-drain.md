---
'@dxos/app-framework': patch
'@dxos/observability': patch
---

Startup reports ready sooner, and PostHog session replay no longer competes with boot.

- `@dxos/app-framework`: `useApp` and the plugin manager's failure supervisor drain activation messages without a yield per message. In the browser each yield was a 4ms timer, which held `startup:ready` ~490ms behind the startup backlog.
- `@dxos/observability`: the PostHog extension takes `sessionRecordingStart`, a promise that holds session recording back until it settles.
