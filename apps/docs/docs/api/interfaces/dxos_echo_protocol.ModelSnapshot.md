---
id: "dxos_echo_protocol.ModelSnapshot"
title: "Interface: ModelSnapshot"
sidebar_label: "ModelSnapshot"
custom_edit_url: null
---

[@dxos/echo-protocol](../modules/dxos_echo_protocol.md).ModelSnapshot

Defined in:
  file://./../../../../../../../common/protocols/src/proto/dxos/echo/snapshot.proto

## Properties

### mutations

• `Optional` **mutations**: [`ModelMutation`](dxos_echo_protocol.ModelMutation.md)[]

Mutations to be applied on top of the snapshot, or on top of initial state if the snapshot is undefined.

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/snapshot.ts:124

___

### snapshot

• `Optional` **snapshot**: `Uint8Array`

Encoded model snapshot (defined by the model's codec).
If undefined the state machine will be initialized with it's default state.

Options:
  - proto3_optional = true

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/snapshot.ts:120
