# Interface `ConfigPluginOpts`
> Declared in [`sdk/config/src/plugin/types.ts`]()


## Properties
### [configPath](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/config/src/plugin/types.ts#L9)
Type: <code>string</code>

Path to the DX config files, defaults to current working directory.

### [devPath](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/config/src/plugin/types.ts#L19)
Type: <code>string</code>

Path to the development overrides for DX config.

### [env](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/config/src/plugin/types.ts#L38)
Type: <code>string[]</code>

Environment variables to be passed to the app.

### [envPath](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/config/src/plugin/types.ts#L14)
Type: <code>string</code>

Path to the environment variable overrides for DX config.

### [mode](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/config/src/plugin/types.ts#L26)
Type: <code>string</code>

If set to  `production`  then config loaders behave differently:
-  `Local`  returns an empty object
-  `Dynamics`  is enabled and makes an HTTP request to the well known config endpoint for config.

### [publicUrl](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/config/src/plugin/types.ts#L33)
Type: <code>string</code>

Public URL of the published app. Also used to load the dynamic config.

    