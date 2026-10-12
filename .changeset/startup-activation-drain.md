---
'@dxos/echo': minor
---

On a cached, signed-out load, Composer reaches `startup:ready` about 2.1s sooner (3,022ms → 901ms median in a headless benchmark), mostly by no longer draining plugin activation messages one per 4ms timer. Its client is ready about 0.3s sooner on a reload because the dedicated worker now spawns at main start.

- `@dxos/app-framework`: the `useApp` listener and the plugin manager's failure supervisor drain activation messages without a yield per message; fibers are tracked with exit observers instead of a forked waiter each; the slow-module warning is one shared watcher instead of a sleeping fiber per module.
- `@dxos/echo`: `Obj.make` takes `{ skipValidation }` for props built from already-typed values.
- `@dxos/client`: `Client` opens its services alongside its proxy imports; `@dxos/client/lock-key` exports the leader lock key for code that runs before the client loads.
- `@dxos/app-framework`, `@dxos/app-toolkit`: plugin assets activate on a new `PluginAssetsRequested` event, and `AppCapability.pluginAsset` takes `content` as a loader (`() => import('…?raw')`) instead of a string. A plugin passing a string must switch to a loader.
- `@dxos/compute`: `Operation.serialize` forwards `Obj.make` options.
- `@dxos/observability`: the PostHog extension takes `sessionRecordingStart`, a promise that holds session recording back until it settles.
- `@dxos/plugin-routine`: operations are serialized into the registry after boot, without validation.
- `@dxos/plugin-markdown`, `@dxos/plugin-inbox`, `@dxos/plugin-google`, `@dxos/plugin-jmap`, `@dxos/plugin-transcription`: modules read only on demand (anchor, comment and tour contributions, mailbox processors, mail send, tour fragments) activate on their feature's start event instead of at idle.
