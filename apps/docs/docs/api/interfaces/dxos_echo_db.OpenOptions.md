---
id: "dxos_echo_db.OpenOptions"
title: "Interface: OpenOptions"
sidebar_label: "OpenOptions"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).OpenOptions

## Properties

### genesisFeedKey

• **genesisFeedKey**: `PublicKey`

Initial feed that contains PartyGenesis message and acts as the root for the feed DAG.

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:40](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L40)

___

### initialTimeframe

• `Optional` **initialTimeframe**: `Timeframe`

Timeframe to start processing feed messages from.

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:44](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L44)

___

### targetTimeframe

• `Optional` **targetTimeframe**: `Timeframe`

Timeframe which must be reached until further processing.
PartyCore.open will block until this timeframe is reached.

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:49](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L49)
