---
id: "dxos_echo_db.PartyProcessor"
title: "Class: PartyProcessor"
sidebar_label: "PartyProcessor"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).PartyProcessor

TODO(burdon): Wrapper/Bridge between HALO APIs.

## Implements

- [`CredentialProcessor`](../interfaces/dxos_echo_db.CredentialProcessor.md)
- [`PartyStateProvider`](../interfaces/dxos_echo_db.PartyStateProvider.md)

## Constructors

### constructor

• **new PartyProcessor**(`_partyKey`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_partyKey` | `PublicKey` |

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:58](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L58)

## Properties

### \_haloMessages

• `Private` **\_haloMessages**: `Message`[] = `[]`

Used to generate halo snapshot.

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:56](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L56)

___

### \_state

• `Private` `Readonly` **\_state**: `PartyState`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:47](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L47)

___

### feedAdded

• `Readonly` **feedAdded**: `Event`<`PublicKey`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:49](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L49)

___

### keyOrInfoAdded

• `Readonly` **keyOrInfoAdded**: `Event`<`PublicKey`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:51](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L51)

## Accessors

### credentialMessages

• `get` **credentialMessages**(): `Map`<`string`, `SignedMessage`\>

#### Returns

`Map`<`string`, `SignedMessage`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:84](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L84)

___

### feedKeys

• `get` **feedKeys**(): `PublicKey`[]

#### Returns

`PublicKey`[]

#### Implementation of

[PartyStateProvider](../interfaces/dxos_echo_db.PartyStateProvider.md).[feedKeys](../interfaces/dxos_echo_db.PartyStateProvider.md#feedkeys)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:76](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L76)

___

### genesisRequired

• `get` **genesisRequired**(): `boolean`

Whether PartyGenesis was already processed.

#### Returns

`boolean`

#### Implementation of

[PartyStateProvider](../interfaces/dxos_echo_db.PartyStateProvider.md).[genesisRequired](../interfaces/dxos_echo_db.PartyStateProvider.md#genesisrequired)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:92](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L92)

___

### infoMessages

• `get` **infoMessages**(): `Map`<`string`, `SignedMessage`\>

#### Returns

`Map`<`string`, `SignedMessage`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:88](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L88)

___

### memberKeys

• `get` **memberKeys**(): `PublicKey`[]

#### Returns

`PublicKey`[]

#### Implementation of

[PartyStateProvider](../interfaces/dxos_echo_db.PartyStateProvider.md).[memberKeys](../interfaces/dxos_echo_db.PartyStateProvider.md#memberkeys)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:80](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L80)

___

### partyKey

• `get` **partyKey**(): `PublicKey`

#### Returns

`PublicKey`

#### Implementation of

[PartyStateProvider](../interfaces/dxos_echo_db.PartyStateProvider.md).[partyKey](../interfaces/dxos_echo_db.PartyStateProvider.md#partykey)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:72](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L72)

___

### state

• `get` **state**(): `PartyState`

#### Returns

`PartyState`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:96](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L96)

## Methods

### getFeedOwningMember

▸ **getFeedOwningMember**(`feedKey`): `undefined` \| `PublicKey`

Returns public key of the member that admitted the specified feed.

#### Parameters

| Name | Type |
| :------ | :------ |
| `feedKey` | `PublicKey` |

#### Returns

`undefined` \| `PublicKey`

#### Implementation of

[PartyStateProvider](../interfaces/dxos_echo_db.PartyStateProvider.md).[getFeedOwningMember](../interfaces/dxos_echo_db.PartyStateProvider.md#getfeedowningmember)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:118](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L118)

___

### getMemberInfo

▸ **getMemberInfo**(`publicKey`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicKey` | `PublicKey` |

#### Returns

`any`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:110](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L110)

___

### getOfflineInvitation

▸ **getOfflineInvitation**(`invitationID`): `undefined` \| `SignedMessage`

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationID` | `Buffer` |

#### Returns

`undefined` \| `SignedMessage`

#### Implementation of

[PartyStateProvider](../interfaces/dxos_echo_db.PartyStateProvider.md).[getOfflineInvitation](../interfaces/dxos_echo_db.PartyStateProvider.md#getofflineinvitation)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:124](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L124)

___

### isFeedAdmitted

▸ **isFeedAdmitted**(`feedKey`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `feedKey` | `PublicKey` |

#### Returns

`boolean`

#### Implementation of

[PartyStateProvider](../interfaces/dxos_echo_db.PartyStateProvider.md).[isFeedAdmitted](../interfaces/dxos_echo_db.PartyStateProvider.md#isfeedadmitted)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:100](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L100)

___

### isMemberKey

▸ **isMemberKey**(`publicKey`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicKey` | `PublicKey` |

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:105](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L105)

___

### makeSnapshot

▸ **makeSnapshot**(): `HaloStateSnapshot`

#### Returns

`HaloStateSnapshot`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:145](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L145)

___

### processMessage

▸ **processMessage**(`message`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `IHaloStream` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[CredentialProcessor](../interfaces/dxos_echo_db.CredentialProcessor.md).[processMessage](../interfaces/dxos_echo_db.CredentialProcessor.md#processmessage)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:138](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L138)

___

### restoreFromSnapshot

▸ **restoreFromSnapshot**(`snapshot`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `snapshot` | `HaloStateSnapshot` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:151](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L151)

___

### takeHints

▸ **takeHints**(`hints`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `hints` | `KeyHint`[] |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:128](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-processor.ts#L128)
