# Interface: Echo

[@dxos/client](../modules/dxos_client.md).Echo

ECHO API.

## Implemented by

- [`EchoProxy`](../classes/dxos_client.EchoProxy.md)

## Properties

### info

 **info**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `parties` | `number` |

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:78](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L78)

## Methods

### acceptInvitation

**acceptInvitation**(`invitationDescriptor`): [`PartyInvitation`](../classes/dxos_client.PartyInvitation.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](../classes/dxos_client.InvitationDescriptor.md) |

#### Returns

[`PartyInvitation`](../classes/dxos_client.PartyInvitation.md)

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:84](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L84)

___

### cloneParty

**cloneParty**(`snapshot`): `Promise`<[`Party`](dxos_client.Party.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `snapshot` | `PartySnapshot` |

#### Returns

`Promise`<[`Party`](dxos_client.Party.md)\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:81](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L81)

___

### createParty

**createParty**(): `Promise`<[`Party`](dxos_client.Party.md)\>

#### Returns

`Promise`<[`Party`](dxos_client.Party.md)\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:80](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L80)

___

### getParty

**getParty**(`partyKey`): `undefined` \| [`Party`](dxos_client.Party.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | [`PublicKey`](../classes/dxos_client.PublicKey.md) |

#### Returns

`undefined` \| [`Party`](dxos_client.Party.md)

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:82](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L82)

___

### queryParties

**queryParties**(): [`ResultSet`](../classes/dxos_client.ResultSet.md)<[`Party`](dxos_client.Party.md)\>

#### Returns

[`ResultSet`](../classes/dxos_client.ResultSet.md)<[`Party`](dxos_client.Party.md)\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:83](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L83)

___

### registerModel

**registerModel**(`constructor`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `constructor` | `ModelConstructor`<`any`\> |

#### Returns

`void`

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:79](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L79)
