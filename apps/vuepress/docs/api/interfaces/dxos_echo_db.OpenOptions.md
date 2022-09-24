# Interface: OpenOptions

[@dxos/echo-db](../modules/dxos_echo_db.md).OpenOptions

## Table of contents

### Properties

- [genesisFeedKey](dxos_echo_db.OpenOptions.md#genesisfeedkey)
- [initialTimeframe](dxos_echo_db.OpenOptions.md#initialtimeframe)
- [targetTimeframe](dxos_echo_db.OpenOptions.md#targettimeframe)

## Properties

### genesisFeedKey

• **genesisFeedKey**: `PublicKey`

Initial feed that contains PartyGenesis message and acts as the root for the feed DAG.

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:40](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L40)

___

### initialTimeframe

• `Optional` **initialTimeframe**: `Timeframe`

Timeframe to start processing feed messages from.

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:44](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L44)

___

### targetTimeframe

• `Optional` **targetTimeframe**: `Timeframe`

Timeframe which must be reached until further processing.
PartyCore.open will block until this timeframe is reached.

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:49](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L49)
