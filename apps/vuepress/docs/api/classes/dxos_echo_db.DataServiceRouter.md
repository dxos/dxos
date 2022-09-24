# Class: DataServiceRouter

[@dxos/echo-db](../modules/dxos_echo_db.md).DataServiceRouter

Routes DataService requests to different DataServiceHost instances based on party id.

## Implements

- `DataService`

## Table of contents

### Constructors

- [constructor](dxos_echo_db.DataServiceRouter.md#constructor)

### Properties

- [\_trackedParties](dxos_echo_db.DataServiceRouter.md#_trackedparties)

### Methods

- [subscribeEntitySet](dxos_echo_db.DataServiceRouter.md#subscribeentityset)
- [subscribeEntityStream](dxos_echo_db.DataServiceRouter.md#subscribeentitystream)
- [trackParty](dxos_echo_db.DataServiceRouter.md#trackparty)
- [write](dxos_echo_db.DataServiceRouter.md#write)

## Constructors

### constructor

• **new DataServiceRouter**()

## Properties

### \_trackedParties

• `Private` `Readonly` **\_trackedParties**: `ComplexMap`<`PublicKey`, [`DataServiceHost`](dxos_echo_db.DataServiceHost.md)\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/data-service-router.ts:31](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/data-service-router.ts#L31)

## Methods

### subscribeEntitySet

▸ **subscribeEntitySet**(`request`): `Stream`<`SubscribeEntitySetResponse`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | `SubscribeEntitySetRequest` |

#### Returns

`Stream`<`SubscribeEntitySetResponse`\>

#### Implementation of

DataService.subscribeEntitySet

#### Defined in

[packages/echo/echo-db/src/packlets/database/data-service-router.ts:38](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/data-service-router.ts#L38)

___

### subscribeEntityStream

▸ **subscribeEntityStream**(`request`): `Stream`<`SubscribeEntityStreamResponse`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | `SubscribeEntityStreamRequest` |

#### Returns

`Stream`<`SubscribeEntityStreamResponse`\>

#### Implementation of

DataService.subscribeEntityStream

#### Defined in

[packages/echo/echo-db/src/packlets/database/data-service-router.ts:44](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/data-service-router.ts#L44)

___

### trackParty

▸ **trackParty**(`key`, `host`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `PublicKey` |
| `host` | [`DataServiceHost`](dxos_echo_db.DataServiceHost.md) |

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/packlets/database/data-service-router.ts:33](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/data-service-router.ts#L33)

___

### write

▸ **write**(`request`): `Promise`<`MutationReceipt`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | `WriteRequest` |

#### Returns

`Promise`<`MutationReceipt`\>

#### Implementation of

DataService.write

#### Defined in

[packages/echo/echo-db/src/packlets/database/data-service-router.ts:50](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/data-service-router.ts#L50)
