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

[packages/sdk/client/src/packlets/api/echo.ts:82](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/echo.ts#L82)

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

[packages/sdk/client/src/packlets/api/echo.ts:88](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/echo.ts#L88)

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

[packages/sdk/client/src/packlets/api/echo.ts:85](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/echo.ts#L85)

___

### createParty

**createParty**(): `Promise`<[`Party`](dxos_client.Party.md)\>

#### Returns

`Promise`<[`Party`](dxos_client.Party.md)\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:84](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/echo.ts#L84)

___

### getParty

**getParty**(`partyKey`): `undefined` \| [`Party`](dxos_client.Party.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |

#### Returns

`undefined` \| [`Party`](dxos_client.Party.md)

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:86](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/echo.ts#L86)

___

### queryParties

**queryParties**(): [`ResultSet`](../classes/dxos_client.ResultSet.md)<[`Party`](dxos_client.Party.md)\>

#### Returns

[`ResultSet`](../classes/dxos_client.ResultSet.md)<[`Party`](dxos_client.Party.md)\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:87](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/echo.ts#L87)

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

[packages/sdk/client/src/packlets/api/echo.ts:83](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/echo.ts#L83)
