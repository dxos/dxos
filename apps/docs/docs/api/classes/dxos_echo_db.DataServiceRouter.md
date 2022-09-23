---
id: "dxos_echo_db.DataServiceRouter"
title: "Class: DataServiceRouter"
sidebar_label: "DataServiceRouter"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).DataServiceRouter

Routes DataService requests to different DataServiceHost instances based on party id.

## Implements

- `DataService`

## Constructors

### constructor

• **new DataServiceRouter**()

## Properties

### \_trackedParties

• `Private` `Readonly` **\_trackedParties**: `ComplexMap`<`PublicKey`, [`DataServiceHost`](dxos_echo_db.DataServiceHost.md)\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/data-service-router.ts:31](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/data-service-router.ts#L31)

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

[packages/echo/echo-db/src/packlets/database/data-service-router.ts:38](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/data-service-router.ts#L38)

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

[packages/echo/echo-db/src/packlets/database/data-service-router.ts:44](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/data-service-router.ts#L44)

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

[packages/echo/echo-db/src/packlets/database/data-service-router.ts:33](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/data-service-router.ts#L33)

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

[packages/echo/echo-db/src/packlets/database/data-service-router.ts:50](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/data-service-router.ts#L50)
