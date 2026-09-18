---
'@dxos/app-toolkit': minor
'@dxos/plugin-settings': minor
'@dxos/plugin-space': minor
---

Every `LayoutOperation.Open` caller now passes the qualified id of a node the app graph builds, so these opens land on their plank instead of doing nothing: trace-panel links, clipped pages, the routines settings panel (from mailbox, calendar and feed properties and from trigger templates), a newly opened folder (now a workspace switch), messages and events opened from a mailbox or calendar rendered without an `attendableId`, and anything opened from the spotlight window, whose forwarder now passes the whole `Open` input through. The generic database path plugin-space resolves for an object of a stored schema uses the schema's entity id, which is how the database section keys it, and `SpaceOperation.Create` returns the new space's Home path as its `subject`.

Debug pages have no URL, so `Open` cannot reach them. `AppSurface.ArticleData` gains an optional `onNavigate(nodeId)`, which the debug panel sets so a page can show another; devtools uses it to link between its pages.

Breaking: `SettingsPath.getPluginRegistrySectionPath` is removed, along with plugin-settings' `OpenPluginRegistry` handler, which opened a path nothing builds. To open the registry, invoke `SettingsOperation.OpenPluginRegistry` (from `@dxos/app-toolkit/SettingsOperation`, no input); plugin-registry's handler switches to the registry workspace. The waiting-for-object toast is removed with `SpaceOperation.WaitForObject` and the space plugin's `awaiting` state: the deck already shows a plank that is still loading and fills it in when the object arrives.
