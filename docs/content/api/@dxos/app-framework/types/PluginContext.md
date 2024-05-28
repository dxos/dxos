# Type `PluginContext`
<sub>Declared in [packages/sdk/app-framework/src/plugins/PluginHost/PluginContext.tsx:10](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/app-framework/src/plugins/PluginHost/PluginContext.tsx#L10)</sub>




## Properties
### [available](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/app-framework/src/plugins/PluginHost/PluginContext.tsx#L29)
Type: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)["meta"][]</code>

All available plugins.


### [enabled](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/app-framework/src/plugins/PluginHost/PluginContext.tsx#L19)
Type: <code>string[]</code>

Ids of plugins which are enabled on this device.


### [plugins](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/app-framework/src/plugins/PluginHost/PluginContext.tsx#L24)
Type: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)[]</code>

Initialized and ready plugins.


### [ready](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/app-framework/src/plugins/PluginHost/PluginContext.tsx#L14)
Type: <code>boolean</code>

All plugins are ready.


### [setPlugin](https://github.com/dxos/dxos/blob/3ca6d230f/packages/sdk/app-framework/src/plugins/PluginHost/PluginContext.tsx#L35)
Type: <code>function</code>

Mark plugin as enabled.
Requires reload to take effect.



