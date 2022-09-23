---
id: "dxos_echo_protocol.InvitationDescriptor-1"
title: "Interface: InvitationDescriptor"
sidebar_label: "InvitationDescriptor"
custom_edit_url: null
---

[@dxos/echo-protocol](../modules/dxos_echo_protocol.md).InvitationDescriptor

Defined in:
  file://./../../../../../../../common/protocols/src/proto/dxos/echo/invitation.proto

## Properties

### identityKey

• `Optional` **identityKey**: `Uint8Array`

Only present if type == OFFLINE.

Options:
  - proto3_optional = true

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/invitation.ts:27

___

### invitation

• **invitation**: `Uint8Array`

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/invitation.ts:20

___

### secret

• `Optional` **secret**: `Uint8Array`

Must be stripped out when passing to another peer.

Options:
  - proto3_optional = true

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/invitation.ts:34

___

### swarmKey

• **swarmKey**: `Uint8Array`

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/invitation.ts:19

___

### type

• **type**: [`Type`](../enums/dxos_echo_protocol.InvitationDescriptor.Type.md)

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/invitation.ts:18
