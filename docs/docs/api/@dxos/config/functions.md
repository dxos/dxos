---
title: Functions
---
# Functions
### [Defaults(basePath)](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/loaders/index.ts#L52)


JSON config.

Returns: <code>T</code>

Arguments: 

`basePath`: <code>string</code>
### [Dynamics()](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/loaders/index.ts#L39)


Provided dynamically by server.

Returns: <code>T</code>

Arguments: none
### [Envs(basePath)](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/loaders/index.ts#L44)


ENV variable (key/value) map

Returns: <code>T</code>

Arguments: 

`basePath`: <code>string</code>
### [LocalStorage()](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/loaders/index.ts#L34)


File storage.

Returns: <code>T</code>

Arguments: none
### [mapFromKeyValues(spec, values)](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/config.ts#L33)


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
### [mapToKeyValues(spec, values)](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/config.ts#L79)


Maps the given flattend set of (key x values) onto a JSON object.

Returns: <code>Record&lt;string, any&gt;</code>

Arguments: 

`spec`: <code>MappingSpec</code>

`values`: <code>any</code>
### [validateConfig(config)](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/config.ts#L101)


Validate config object.

Returns: <code>[Config](/api/@dxos/config/interfaces/Config)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/config/interfaces/Config)</code>