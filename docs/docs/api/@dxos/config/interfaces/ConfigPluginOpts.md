# Interface `ConfigPluginOpts`
> Declared in [`packages/sdk/config/src/plugin/types.ts`]()



## Properties
### [configPath](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/plugin/types.ts#L9)
Type: <code>string</code>

Path to the DX config files, defaults to current working directory.

### [devPath](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/plugin/types.ts#L19)
Type: <code>string</code>

Path to the development overrides for DX config.

### [dynamic](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/plugin/types.ts#L32)
Type: <code>boolean</code>

The Dynamics() config.yml file is special, it will be loaded if the dynamic property is set to false.
If dynamic is set to true each app will try to load from an endpoint (using {publicUrl}/.well-known/dx/config),
wire app serve adds config endpoints for each app serving the global config file (~/.wire/remote.yml).

The usual pattern is to set it to CONFIG_DYNAMIC env variable.
When running app locally this should be set to false or nil to serve local config.
And when publishing the app to DXNS the cli-app will set that variable to true automatically.

### [env](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/plugin/types.ts#L44)
Type: <code>string[]</code>

Environment variables to be passed to the app.

### [envPath](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/plugin/types.ts#L14)
Type: <code>string</code>

Path to the environment variable overrides for DX config.

### [publicUrl](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/plugin/types.ts#L39)
Type: <code>string</code>

Public URL of the published app. Also used to load the dynamic config.
