---
'@dxos/app-toolkit': minor
'@dxos/plugin-deck': minor
---

`AppCapability.surface({ roles })` now takes role tokens (`[AppSurface.Article]`) instead of NSID strings, and `@dxos/app-toolkit/AppSurface` can be imported without loading React, using the new `@dxos/app-framework/SurfaceFilter`. Breaking: plugin role modules are renamed to `<Plugin>Surface`: `@dxos/plugin-deck/DeckRole` is now `DeckSurface`, `@dxos/plugin-map/MapRole` is now `MapSurface`, `@dxos/plugin-assistant/ChatSurface` is now `AssistantSurface`, and the projects settings role moves from `ProjectView.Settings` to `@dxos/plugin-projects/ProjectSurface`.
