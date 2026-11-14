---
'@dxos/plugin-client': minor
---

`ClientEvents.SpacesAvailable` fires as soon as the client is ready, without waiting for the `ClientEvents.Initialized` activation wave, so a boot-cached app shows its spaces before every plugin module has loaded; a module on `SpacesAvailable` must `require` any capability it reads from that wave. The new `ClientEvents.ServicesReady` fires after that wave, once the client services answer, and the observability plugin wires its metrics providers on it instead of `Initialized`. Breaking: `ObservabilityCapabilities.ClientInitialized` is replaced by `ClientServicesReady`.
