# Interface: Options

[@dxos/broadcast](../modules/dxos_broadcast.md).Options

## Hierarchy

- [`CacheOptions`](dxos_broadcast.CacheOptions.md)

  ↳ **`Options`**

## Properties

### id

 `Optional` **id**: `Buffer`

Defines an id for the current peer.

#### Defined in

[packages/core/mesh/broadcast/src/broadcast.ts:56](https://github.com/dxos/dxos/blob/main/packages/core/mesh/broadcast/src/broadcast.ts#L56)

___

### maxAge

 `Optional` **maxAge**: `number`

Defines the max live time for the cache messages.

Default: 10000.

#### Inherited from

[CacheOptions](dxos_broadcast.CacheOptions.md).[maxAge](dxos_broadcast.CacheOptions.md#maxage)

#### Defined in

[packages/core/mesh/broadcast/src/broadcast.ts:43](https://github.com/dxos/dxos/blob/main/packages/core/mesh/broadcast/src/broadcast.ts#L43)

___

### maxSize

 `Optional` **maxSize**: `number`

Defines the max size for the cache messages.

Default: 1000.

#### Inherited from

[CacheOptions](dxos_broadcast.CacheOptions.md).[maxSize](dxos_broadcast.CacheOptions.md#maxsize)

#### Defined in

[packages/core/mesh/broadcast/src/broadcast.ts:49](https://github.com/dxos/dxos/blob/main/packages/core/mesh/broadcast/src/broadcast.ts#L49)
