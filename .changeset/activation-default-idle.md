---
'@dxos/app-framework': minor
'@dxos/app-toolkit': minor
---

Omitting `activatesOn` on a plugin module now puts it in the **idle** wave rather than the startup wave. A module that must run at boot has to declare `activatesOn: ActivationEvents.Startup` explicitly.

This is a behaviour change for out-of-repo plugin authors: an un-annotated module that previously ran during startup now runs at host idle. Un-annotated modules remain pullable as providers, so one that a startup module `requires` is still activated ahead of its own wave — the change is only visible for modules nothing on the boot path depends on.

The `@dxos/app-toolkit` maker families that back the app shell — `settings`, `operationHandler`, `reactContext`, `reactRoot`, `navigationResolver` and `navigationHandler` — now state `Startup` explicitly, so modules built with them are unaffected. `appGraphBuilder` (idle) and `skillDefinition` (assistant start) were already explicit.
