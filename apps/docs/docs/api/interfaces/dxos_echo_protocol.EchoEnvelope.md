---
id: "dxos_echo_protocol.EchoEnvelope"
title: "Interface: EchoEnvelope"
sidebar_label: "EchoEnvelope"
custom_edit_url: null
---

[@dxos/echo-protocol](../modules/dxos_echo_protocol.md).EchoEnvelope

Wrapper for all ECHO messages.

Defined in:
  file://./../../../../../../../common/protocols/src/proto/dxos/echo/feed.proto

## Properties

### genesis

• `Optional` **genesis**: [`ItemGenesis`](dxos_echo_protocol.ItemGenesis.md)

Options:
  - proto3_optional = true

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/feed.ts:46

___

### itemId

• **itemId**: `string`

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/feed.ts:41

___

### itemMutation

• `Optional` **itemMutation**: [`ItemMutation`](dxos_echo_protocol.ItemMutation-1.md)

Options:
  - proto3_optional = true

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/feed.ts:51

___

### mutation

• `Optional` **mutation**: `Uint8Array`

Options:
  - proto3_optional = true

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/feed.ts:56

___

### snapshot

• `Optional` **snapshot**: [`ModelSnapshot`](dxos_echo_protocol.ModelSnapshot.md)

Set the model to the provided snapshot.

Options:
  - proto3_optional = true

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/feed.ts:63
