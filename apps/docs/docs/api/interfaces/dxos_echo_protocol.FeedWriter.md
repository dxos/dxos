---
id: "dxos_echo_protocol.FeedWriter"
title: "Interface: FeedWriter<T>"
sidebar_label: "FeedWriter"
custom_edit_url: null
---

[@dxos/echo-protocol](../modules/dxos_echo_protocol.md).FeedWriter

## Type parameters

| Name |
| :------ |
| `T` |

## Implemented by

- [`MockFeedWriter`](../classes/dxos_echo_protocol.MockFeedWriter.md)

## Properties

### write

• **write**: (`message`: `T`) => `Promise`<[`WriteReceipt`](dxos_echo_protocol.WriteReceipt.md)\>

#### Type declaration

▸ (`message`): `Promise`<[`WriteReceipt`](dxos_echo_protocol.WriteReceipt.md)\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `T` |

##### Returns

`Promise`<[`WriteReceipt`](dxos_echo_protocol.WriteReceipt.md)\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-writer.ts:20](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L20)
