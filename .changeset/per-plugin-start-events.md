---
'@dxos/app-framework': minor
---

Replace the coarse `DeferredStartup` activation event with per-plugin start events. **Breaking:** `ActivationEvents.DeferredStartup` and `ActivationEvents.SkillsRequested` are removed. Each plugin now exports `<Name>Events.Start` (id `<pluginKey>.event.start`, built with the new `ActivationEvent.pluginStart`); a plugin's off-critical-path modules activate on its own start event, and cross-plugin contributions (skills, markdown extensions, connectors, game variants) activate on the consuming plugin's event — `AppCapability.skillDefinition` now defaults to the assistant's start event. Hosts fire the events via the new `ActivationEvents.activateAllPluginStartEvents` idle trickle, enabling a plugin after startup fires its own start event automatically, and the test harness fires all start events after `Startup`.
