---
id: "dxos_echo_protocol.PartyMetadata"
title: "Interface: PartyMetadata"
sidebar_label: "PartyMetadata"
custom_edit_url: null
---

[@dxos/echo-protocol](../modules/dxos_echo_protocol.md).PartyMetadata

Defined in:
  file://./../../../../../../../common/protocols/src/proto/dxos/echo/metadata.proto

## Properties

### controlFeedKey

• `Optional` **controlFeedKey**: `PublicKey`

Key of the wriatable control feed.

Options:
  - proto3_optional = true

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/metadata.ts:49

___

### dataFeedKey

• `Optional` **dataFeedKey**: `PublicKey`

Key of the wriatable data feed.

Options:
  - proto3_optional = true

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/metadata.ts:56

___

### feedKeys

• `Optional` **feedKeys**: `PublicKey`[]

List of all feed associated with the party.

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/metadata.ts:65

___

### genesisFeedKey

• `Optional` **genesisFeedKey**: `PublicKey`

Options:
  - proto3_optional = true

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/metadata.ts:42

___

### key

• **key**: `PublicKey`

Party key.

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/metadata.ts:37

___

### latestTimeframe

• `Optional` **latestTimeframe**: `Timeframe`

Options:
  - proto3_optional = true

#### Defined in

packages/echo/echo-protocol/src/proto/gen/dxos/echo/metadata.ts:61
