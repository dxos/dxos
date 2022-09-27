---
id: "dxos_echo_db.PartyProtocolFactory"
title: "Class: PartyProtocolFactory"
sidebar_label: "PartyProtocolFactory"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).PartyProtocolFactory

Manages the party's connection to the network swarm.

## Constructors

### constructor

• **new PartyProtocolFactory**(`_partyKey`, `_networkManager`, `_peerId`, `_credentials`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_partyKey` | `PublicKey` |
| `_networkManager` | `NetworkManager` |
| `_peerId` | `PublicKey` |
| `_credentials` | [`CredentialsProvider`](../interfaces/dxos_echo_db.CredentialsProvider.md) |

#### Defined in

[packages/echo/echo-db/src/protocol/party-protocol-factory.ts:26](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/protocol/party-protocol-factory.ts#L26)

## Properties

### \_presencePlugin

• `Private` `Readonly` **\_presencePlugin**: `PresencePlugin`

#### Defined in

[packages/echo/echo-db/src/protocol/party-protocol-factory.ts:22](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/protocol/party-protocol-factory.ts#L22)

___

### \_started

• `Private` **\_started**: `boolean` = `false`

#### Defined in

[packages/echo/echo-db/src/protocol/party-protocol-factory.ts:24](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/protocol/party-protocol-factory.ts#L24)

## Methods

### \_createProtocol

▸ `Private` **_createProtocol**(`channel`, `opts`, `extraPlugins`): `Protocol`

#### Parameters

| Name | Type |
| :------ | :------ |
| `channel` | `any` |
| `opts` | `Object` |
| `opts.initiator` | `boolean` |
| `extraPlugins` | `Plugin`[] |

#### Returns

`Protocol`

#### Defined in

[packages/echo/echo-db/src/protocol/party-protocol-factory.ts:67](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/protocol/party-protocol-factory.ts#L67)

___

### start

▸ **start**(`plugins`): `Promise`<`undefined` \| () => `Promise`<`void`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `plugins` | `Plugin`[] |

#### Returns

`Promise`<`undefined` \| () => `Promise`<`void`\>\>

#### Defined in

[packages/echo/echo-db/src/protocol/party-protocol-factory.ts:33](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/protocol/party-protocol-factory.ts#L33)

___

### stop

▸ **stop**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/protocol/party-protocol-factory.ts:57](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/protocol/party-protocol-factory.ts#L57)
