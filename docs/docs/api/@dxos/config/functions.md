---
title: Functions
---
# Functions
### [Defaults(basePath)](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/loaders/index.ts#L51)


JSON config.

Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: 

`basePath`: <code>string</code>


### [Dynamics()](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/loaders/index.ts#L38)


Provided dynamically by server.

Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: none




### [Envs(basePath)](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/loaders/index.ts#L43)


ENV variable (key/value) map.

Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: 

`basePath`: <code>string</code>


### [Local()](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/loaders/index.ts#L33)


Development config.

Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: none




### [definitions(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/plugin/definitions.ts#L19)




Returns: <code>object</code>

Arguments: 

`options`: <code>[ConfigPluginOpts](/api/@dxos/config/interfaces/ConfigPluginOpts)</code>


### [mapFromKeyValues(spec, values)](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/config.ts#L32)


Maps the given objects onto a flattened set of (key x values).

Expects parsed yaml content of the form:

 ```
ENV_VAR:
  path: config.selector.path
```

Returns: <code>object</code>

Arguments: 

`spec`: <code>MappingSpec</code>

`values`: <code>Record&lt;string, any&gt;</code>


### [mapToKeyValues(spec, values)](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/config.ts#L78)


Maps the given flattend set of (key x values) onto a JSON object.

Returns: <code>Record&lt;string, any&gt;</code>

Arguments: 

`spec`: <code>MappingSpec</code>

`values`: <code>any</code>


### [validateConfig(config)](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/config.ts#L100)


Validate config object.

Returns: <code>[Config](/api/@dxos/config/interfaces/Config)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/config/interfaces/Config)</code>


