---
title: Functions
---
# Functions
### [`Defaults`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/loaders/index.ts#L51)


JSON config.

Returns: `T`

Arguments: 

`basePath`: `string`
### [`Dynamics`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/loaders/index.ts#L38)


Provided dynamically by server.

Returns: `T`

Arguments: none
### [`Envs`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/loaders/index.ts#L43)


ENV variable (key/value) map

Returns: `T`

Arguments: 

`basePath`: `string`
### [`LocalStorage`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/loaders/index.ts#L33)


File storage.

Returns: `T`

Arguments: none
### [`mapFromKeyValues`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L31)


Maps the given objects onto a flattened set of (key x values).

Expects parsed yaml content of the form:

 ```
ENV_VAR:
  path: config.selector.path
```

Returns: `object`

Arguments: 

`spec`: `MappingSpec`

`values`: `Record<string, any>`
### [`mapToKeyValues`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L77)


Maps the given flattend set of (key x values) onto a JSON object.

Returns: `Record<string, any>`

Arguments: 

`spec`: `MappingSpec`

`values`: `any`