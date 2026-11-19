---
'@dxos/app-toolkit': minor
'@dxos/plugin-deck': minor
'@dxos/plugin-presenter': minor
'@dxos/plugin-space': minor
---

A link can name an action that runs on the object it opens, so a public link to a presentation opens already presenting. The URL carries the action as `?action=<name>`, its DXN without the `dxn:` prefix. Plugins contribute actions with `AppCapabilities.LinkAction`, each scoped to internal or public links and to the objects it applies to; `@dxos/app-toolkit/LinkAction` adds the action to a link (`withAction`), finds it (`find`) and strips it (`withoutAction`). The deck runs the action once the object is open, and the boot loader stays up until it has run, for 10 seconds at most.
