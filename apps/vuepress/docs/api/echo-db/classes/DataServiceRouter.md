# Class: DataServiceRouter

Routes DataService requests to different DataServiceHost instances based on party id.

## Implements

- `DataService`

## Table of contents

### Constructors

- [constructor](DataServiceRouter.md#constructor)

### Properties

- [\_trackedParties](DataServiceRouter.md#_trackedparties)

### Methods

- [subscribeEntitySet](DataServiceRouter.md#subscribeentityset)
- [subscribeEntityStream](DataServiceRouter.md#subscribeentitystream)
- [trackParty](DataServiceRouter.md#trackparty)
- [write](DataServiceRouter.md#write)

## Constructors

### constructor

• **new DataServiceRouter**()

## Properties

### \_trackedParties

• `Private` `Readonly` **\_trackedParties**: `ComplexMap`<`PublicKey`, [`DataServiceHost`](DataServiceHost.md)\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/data-service-router.ts:31](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/data-service-router.ts#L31)

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

[packages/echo/echo-db/src/packlets/database/data-service-router.ts:38](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/data-service-router.ts#L38)

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

[packages/echo/echo-db/src/packlets/database/data-service-router.ts:44](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/data-service-router.ts#L44)

___

### trackParty

▸ **trackParty**(`key`, `host`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `PublicKey` |
| `host` | [`DataServiceHost`](DataServiceHost.md) |

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/packlets/database/data-service-router.ts:33](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/data-service-router.ts#L33)

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

[packages/echo/echo-db/src/packlets/database/data-service-router.ts:50](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/data-service-router.ts#L50)
