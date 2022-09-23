---
id: "dxos_echo_protocol.DataService"
title: "Interface: DataService"
sidebar_label: "DataService"
custom_edit_url: null
---

[@dxos/echo-protocol](../modules/dxos_echo_protocol.md).DataService

Defined in:
  file://./../../../../../../../common/protocols/src/proto/dxos/echo/service.proto

## Properties

### subscribeEntitySet

• **subscribeEntitySet**: (`request`: [`SubscribeEntitySetRequest`](dxos_echo_protocol.SubscribeEntitySetRequest.md)) => `Stream`<[`SubscribeEntitySetResponse`](dxos_echo_protocol.SubscribeEntitySetResponse.md)\>

#### Type declaration

▸ (`request`): `Stream`<[`SubscribeEntitySetResponse`](dxos_echo_protocol.SubscribeEntitySetResponse.md)\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `request` | [`SubscribeEntitySetRequest`](dxos_echo_protocol.SubscribeEntitySetRequest.md) |

##### Returns

`Stream`<[`SubscribeEntitySetResponse`](dxos_echo_protocol.SubscribeEntitySetResponse.md)\>

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/service.ts:87

___

### subscribeEntityStream

• **subscribeEntityStream**: (`request`: [`SubscribeEntityStreamRequest`](dxos_echo_protocol.SubscribeEntityStreamRequest.md)) => `Stream`<[`SubscribeEntityStreamResponse`](dxos_echo_protocol.SubscribeEntityStreamResponse-1.md)\>

#### Type declaration

▸ (`request`): `Stream`<[`SubscribeEntityStreamResponse`](dxos_echo_protocol.SubscribeEntityStreamResponse-1.md)\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `request` | [`SubscribeEntityStreamRequest`](dxos_echo_protocol.SubscribeEntityStreamRequest.md) |

##### Returns

`Stream`<[`SubscribeEntityStreamResponse`](dxos_echo_protocol.SubscribeEntityStreamResponse-1.md)\>

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/service.ts:88

___

### write

• **write**: (`request`: [`WriteRequest`](dxos_echo_protocol.WriteRequest.md)) => `Promise`<[`MutationReceipt`](dxos_echo_protocol.MutationReceipt.md)\>

#### Type declaration

▸ (`request`): `Promise`<[`MutationReceipt`](dxos_echo_protocol.MutationReceipt.md)\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `request` | [`WriteRequest`](dxos_echo_protocol.WriteRequest.md) |

##### Returns

`Promise`<[`MutationReceipt`](dxos_echo_protocol.MutationReceipt.md)\>

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/service.ts:89
