---
title: Functions
---
# Functions
### [`Defaults`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/loaders/index.ts#L49)


JSON config.

Returns: `T`

Arguments: 

`basePath`: `string`
### [`Dynamics`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/loaders/index.ts#L36)


Provided dynamically by server.

Returns: `T`

Arguments: none
### [`Envs`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/loaders/index.ts#L41)


ENV variable (key/value) map

Returns: `T`

Arguments: 

`basePath`: `string`
### [`LocalStorage`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/loaders/index.ts#L31)


File storage.

Returns: `T`

Arguments: none
### [`mapFromKeyValues`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L23)


Maps the given objects onto a flattened set of (key x values).

Returns: `object`

Arguments: 

`spec`: `MappingSpec`

`values`: `Record<string, any>`
### [`mapToKeyValues`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L69)


Maps the given flattend set of (key x values) onto a JSON object.

Returns: `Record<string, any>`

Arguments: 

`spec`: `MappingSpec`

`values`: `any`