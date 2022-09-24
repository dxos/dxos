# Class: PartyProcessor

TODO(burdon): Wrapper/Bridge between HALO APIs.

## Implements

- [`CredentialProcessor`](../interfaces/CredentialProcessor.md)
- [`PartyStateProvider`](../interfaces/PartyStateProvider.md)

## Table of contents

### Constructors

- [constructor](PartyProcessor.md#constructor)

### Properties

- [\_haloMessages](PartyProcessor.md#_halomessages)
- [\_state](PartyProcessor.md#_state)
- [feedAdded](PartyProcessor.md#feedadded)
- [keyOrInfoAdded](PartyProcessor.md#keyorinfoadded)

### Accessors

- [credentialMessages](PartyProcessor.md#credentialmessages)
- [feedKeys](PartyProcessor.md#feedkeys)
- [genesisRequired](PartyProcessor.md#genesisrequired)
- [infoMessages](PartyProcessor.md#infomessages)
- [memberKeys](PartyProcessor.md#memberkeys)
- [partyKey](PartyProcessor.md#partykey)
- [state](PartyProcessor.md#state)

### Methods

- [getFeedOwningMember](PartyProcessor.md#getfeedowningmember)
- [getMemberInfo](PartyProcessor.md#getmemberinfo)
- [getOfflineInvitation](PartyProcessor.md#getofflineinvitation)
- [isFeedAdmitted](PartyProcessor.md#isfeedadmitted)
- [isMemberKey](PartyProcessor.md#ismemberkey)
- [makeSnapshot](PartyProcessor.md#makesnapshot)
- [processMessage](PartyProcessor.md#processmessage)
- [restoreFromSnapshot](PartyProcessor.md#restorefromsnapshot)
- [takeHints](PartyProcessor.md#takehints)

## Constructors

### constructor

• **new PartyProcessor**(`_partyKey`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_partyKey` | `PublicKey` |

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:52](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L52)

## Properties

### \_haloMessages

• `Private` **\_haloMessages**: `Message`[] = `[]`

Used to generate halo snapshot.

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:50](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L50)

___

### \_state

• `Private` `Readonly` **\_state**: `PartyState`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:41](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L41)

___

### feedAdded

• `Readonly` **feedAdded**: `Event`<`PublicKey`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:43](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L43)

___

### keyOrInfoAdded

• `Readonly` **keyOrInfoAdded**: `Event`<`PublicKey`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:45](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L45)

## Accessors

### credentialMessages

• `get` **credentialMessages**(): `Map`<`string`, `SignedMessage`\>

#### Returns

`Map`<`string`, `SignedMessage`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:78](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L78)

___

### feedKeys

• `get` **feedKeys**(): `PublicKey`[]

#### Returns

`PublicKey`[]

#### Implementation of

[PartyStateProvider](../interfaces/PartyStateProvider.md).[feedKeys](../interfaces/PartyStateProvider.md#feedkeys)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:70](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L70)

___

### genesisRequired

• `get` **genesisRequired**(): `boolean`

Whether PartyGenesis was already processed.

#### Returns

`boolean`

#### Implementation of

[PartyStateProvider](../interfaces/PartyStateProvider.md).[genesisRequired](../interfaces/PartyStateProvider.md#genesisrequired)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:86](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L86)

___

### infoMessages

• `get` **infoMessages**(): `Map`<`string`, `SignedMessage`\>

#### Returns

`Map`<`string`, `SignedMessage`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:82](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L82)

___

### memberKeys

• `get` **memberKeys**(): `PublicKey`[]

#### Returns

`PublicKey`[]

#### Implementation of

[PartyStateProvider](../interfaces/PartyStateProvider.md).[memberKeys](../interfaces/PartyStateProvider.md#memberkeys)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:74](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L74)

___

### partyKey

• `get` **partyKey**(): `PublicKey`

#### Returns

`PublicKey`

#### Implementation of

[PartyStateProvider](../interfaces/PartyStateProvider.md).[partyKey](../interfaces/PartyStateProvider.md#partykey)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:66](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L66)

___

### state

• `get` **state**(): `PartyState`

#### Returns

`PartyState`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:90](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L90)

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

[PartyStateProvider](../interfaces/PartyStateProvider.md).[getFeedOwningMember](../interfaces/PartyStateProvider.md#getfeedowningmember)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:112](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L112)

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

[packages/echo/echo-db/src/pipeline/party-processor.ts:104](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L104)

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

[PartyStateProvider](../interfaces/PartyStateProvider.md).[getOfflineInvitation](../interfaces/PartyStateProvider.md#getofflineinvitation)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:118](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L118)

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

[PartyStateProvider](../interfaces/PartyStateProvider.md).[isFeedAdmitted](../interfaces/PartyStateProvider.md#isfeedadmitted)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:94](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L94)

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

[packages/echo/echo-db/src/pipeline/party-processor.ts:99](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L99)

___

### makeSnapshot

▸ **makeSnapshot**(): `HaloStateSnapshot`

#### Returns

`HaloStateSnapshot`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:140](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L140)

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

[CredentialProcessor](../interfaces/CredentialProcessor.md).[processMessage](../interfaces/CredentialProcessor.md#processmessage)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-processor.ts:133](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L133)

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

[packages/echo/echo-db/src/pipeline/party-processor.ts:146](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L146)

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

[packages/echo/echo-db/src/pipeline/party-processor.ts:122](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-processor.ts#L122)
