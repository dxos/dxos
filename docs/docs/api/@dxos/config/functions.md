---
title: Functions
---
# Functions
### [Defaults(basePath)](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/loaders/index.ts#L51)


JSON config.

Returns: <code>T</code>

Arguments: 

`basePath`: <code>string</code>
### [Dynamics()](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/loaders/index.ts#L38)


Provided dynamically by server.

Returns: <code>T</code>

Arguments: none
### [Envs(basePath)](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/loaders/index.ts#L43)


ENV variable (key/value) map

Returns: <code>T</code>

Arguments: 

`basePath`: <code>string</code>
### [LocalStorage()](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/loaders/index.ts#L33)


File storage.

Returns: <code>T</code>

Arguments: none
### [mapFromKeyValues(spec, values)](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L31)


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
### [mapToKeyValues(spec, values)](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L77)


Maps the given flattend set of (key x values) onto a JSON object.

Returns: <code>Record&lt;string, any&gt;</code>

Arguments: 

`spec`: <code>MappingSpec</code>

`values`: <code>any</code>