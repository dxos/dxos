---
id: "dxos_echo_protocol.EchoMetadata"
title: "Interface: EchoMetadata"
sidebar_label: "EchoMetadata"
custom_edit_url: null
---

[@dxos/echo-protocol](../modules/dxos_echo_protocol.md).EchoMetadata

Defined in:
  file://./../../../../../../../common/protocols/src/proto/dxos/echo/metadata.proto

## Properties

### created

• **created**: `Date`

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/metadata.ts:26

___

### parties

• `Optional` **parties**: [`PartyMetadata`](dxos_echo_protocol.PartyMetadata.md)[]

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/metadata.ts:25

___

### updated

• **updated**: `Date`

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/metadata.ts:27

___

### version

• **version**: `number`

Version number that is inceremnted every time there's a breaking change to the storage schema.

This is used to detect if the storage schema has changed since the last time the client was run.
Loading data from a different version will might result in an error.

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/metadata.ts:24
