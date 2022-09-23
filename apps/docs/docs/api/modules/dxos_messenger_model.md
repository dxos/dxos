---
id: "dxos_messenger_model"
title: "Module: @dxos/messenger-model"
sidebar_label: "@dxos/messenger-model"
sidebar_position: 0
custom_edit_url: null
---

## Classes

- [MessengerModel](../classes/dxos_messenger_model.MessengerModel.md)

## Interfaces

- [Message](../interfaces/dxos_messenger_model.Message.md)
- [SERVICES](../interfaces/dxos_messenger_model.SERVICES.md)
- [TYPES](../interfaces/dxos_messenger_model.TYPES.md)

## Variables

### TYPE\_MESSENGER\_CHANNEL

• `Const` **TYPE\_MESSENGER\_CHANNEL**: ``"dxos:type/messenger/channel"``

Standard type of an ObjectModel parent for a set of messages.
Includes metadata for a message channel (e.g., title).

#### Defined in

[packages/echo/messenger-model/src/types.ts:9](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/messenger-model/src/types.ts#L9)

___

### TYPE\_MESSENGER\_MESSAGES

• `Const` **TYPE\_MESSENGER\_MESSAGES**: ``"dxos:type/messenger/messages"``

Standard type of a set of messages as defined by the MessengerModel.

#### Defined in

[packages/echo/messenger-model/src/types.ts:14](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/messenger-model/src/types.ts#L14)

___

### schema

• `Const` **schema**: `Schema`<[`TYPES`](../interfaces/dxos_messenger_model.TYPES.md), [`SERVICES`](../interfaces/dxos_messenger_model.SERVICES.md)\>

#### Defined in

packages/echo/messenger-model/src/proto/gen/index.ts:9

___

### schemaJson

• `Const` **schemaJson**: `any`

#### Defined in

packages/echo/messenger-model/src/proto/gen/index.ts:8
