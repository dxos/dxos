# Class: FeedDescriptor

[@dxos/feed-store](../modules/dxos_feed_store.md).FeedDescriptor

FeedDescriptor

Abstract handler for an Hypercore instance.

## Constructors

### constructor

**new FeedDescriptor**(`options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `FeedDescriptorOptions` |

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:42](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L42)

## Properties

### \_directory

 `Private` `Readonly` **\_directory**: `Directory`

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:32](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L32)

___

### \_disableSigning

 `Private` `Readonly` **\_disableSigning**: `boolean`

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:38](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L38)

___

### \_feed

 `Private` **\_feed**: ``null`` \| [`HypercoreFeed`](../interfaces/dxos_feed_store.HypercoreFeed.md)

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:40](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L40)

___

### \_hypercore

 `Private` `Readonly` **\_hypercore**: [`Hypercore`](../types/dxos_feed_store.Hypercore.md)

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:36](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L36)

___

### \_key

 `Private` `Readonly` **\_key**: `PublicKey`

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:33](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L33)

___

### \_lock

 `Private` `Readonly` **\_lock**: `Lock`

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:37](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L37)

___

### \_secretKey

 `Private` `Optional` `Readonly` **\_secretKey**: `Buffer`

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:34](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L34)

___

### \_valueEncoding

 `Private` `Optional` `Readonly` **\_valueEncoding**: `ValueEncoding`

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:35](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L35)

## Accessors

### feed

`get` **feed**(): [`HypercoreFeed`](../interfaces/dxos_feed_store.HypercoreFeed.md)

#### Returns

[`HypercoreFeed`](../interfaces/dxos_feed_store.HypercoreFeed.md)

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:64](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L64)

___

### key

`get` **key**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:73](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L73)

___

### opened

`get` **opened**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:69](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L69)

___

### secretKey

`get` **secretKey**(): `undefined` \| `Buffer`

#### Returns

`undefined` \| `Buffer`

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:77](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L77)

___

### valueEncoding

`get` **valueEncoding**(): `undefined` \| `ValueEncoding`

#### Returns

`undefined` \| `ValueEncoding`

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:81](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L81)

___

### writable

`get` **writable**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:85](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L85)

## Methods

### \_createStorage

`Private` **_createStorage**(`dir?`): (`name`: `string`) => `HypercoreFile`

Defines the real path where the Hypercore is going
to work with the RandomAccessStorage specified.

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `dir` | `string` | `''` |

#### Returns

`fn`

(`name`): `HypercoreFile`

Defines the real path where the Hypercore is going
to work with the RandomAccessStorage specified.

##### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

##### Returns

`HypercoreFile`

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:124](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L124)

___

### \_open

`Private` **_open**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:139](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L139)

___

### append

**append**(`message`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:153](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L153)

___

### close

**close**(): `Promise`<`void`\>

Close the Hypercore referenced by the descriptor.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:109](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L109)

___

### open

**open**(): `Promise`<[`HypercoreFeed`](../interfaces/dxos_feed_store.HypercoreFeed.md)\>

Open an Hypercore feed based on the related feed options.

This is an atomic operation, FeedDescriptor makes
sure that the feed is not going to open again.

#### Returns

`Promise`<[`HypercoreFeed`](../interfaces/dxos_feed_store.HypercoreFeed.md)\>

#### Defined in

[packages/echo/feed-store/src/feed-descriptor.ts:95](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/feed-descriptor.ts#L95)
