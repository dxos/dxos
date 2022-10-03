# Class: DataService

[@dxos/echo-db](../modules/dxos_echo_db.md).DataService

Routes DataService requests to different DataServiceHost instances based on party id.

## Implements

- `DataService`

## Constructors

### constructor

**new DataService**()

## Properties

### \_trackedParties

 `Private` `Readonly` **\_trackedParties**: `ComplexMap`<`PublicKey`, [`DataServiceHost`](dxos_echo_db.DataServiceHost.md)\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/data-service.ts:32](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/data-service.ts#L32)

## Methods

### subscribeEntitySet

**subscribeEntitySet**(`request`): `Stream`<`SubscribeEntitySetResponse`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | `SubscribeEntitySetRequest` |

#### Returns

`Stream`<`SubscribeEntitySetResponse`\>

#### Implementation of

DataServiceRpc.subscribeEntitySet

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/data-service.ts:40](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/data-service.ts#L40)

___

### subscribeEntityStream

**subscribeEntityStream**(`request`): `Stream`<`SubscribeEntityStreamResponse`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | `SubscribeEntityStreamRequest` |

#### Returns

`Stream`<`SubscribeEntityStreamResponse`\>

#### Implementation of

DataServiceRpc.subscribeEntityStream

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/data-service.ts:46](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/data-service.ts#L46)

___

### trackParty

**trackParty**(`key`, `host`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `PublicKey` |
| `host` | [`DataServiceHost`](dxos_echo_db.DataServiceHost.md) |

#### Returns

`void`

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/data-service.ts:35](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/data-service.ts#L35)

___

### write

**write**(`request`): `Promise`<`MutationReceipt`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | `WriteRequest` |

#### Returns

`Promise`<`MutationReceipt`\>

#### Implementation of

DataServiceRpc.write

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/data-service.ts:52](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/data-service.ts#L52)
