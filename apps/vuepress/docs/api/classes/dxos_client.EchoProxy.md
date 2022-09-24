# Class: EchoProxy

[@dxos/client](../modules/dxos_client.md).EchoProxy

Client proxy to local/remote ECHO service.

## Implements

- [`Echo`](../interfaces/dxos_client.Echo.md)

## Table of contents

### Constructors

- [constructor](dxos_client.EchoProxy.md#constructor)

### Properties

- [\_modelFactory](dxos_client.EchoProxy.md#_modelfactory)
- [\_parties](dxos_client.EchoProxy.md#_parties)
- [\_partiesChanged](dxos_client.EchoProxy.md#_partieschanged)
- [\_subscriptions](dxos_client.EchoProxy.md#_subscriptions)

### Accessors

- [info](dxos_client.EchoProxy.md#info)
- [modelFactory](dxos_client.EchoProxy.md#modelfactory)
- [networkManager](dxos_client.EchoProxy.md#networkmanager)

### Methods

- [acceptInvitation](dxos_client.EchoProxy.md#acceptinvitation)
- [cloneParty](dxos_client.EchoProxy.md#cloneparty)
- [createParty](dxos_client.EchoProxy.md#createparty)
- [getParty](dxos_client.EchoProxy.md#getparty)
- [queryParties](dxos_client.EchoProxy.md#queryparties)
- [registerModel](dxos_client.EchoProxy.md#registermodel)
- [toString](dxos_client.EchoProxy.md#tostring)

## Constructors

### constructor

• **new EchoProxy**(`_serviceProvider`, `_haloProxy`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_serviceProvider` | [`ClientServiceProvider`](../interfaces/dxos_client.ClientServiceProvider.md) |
| `_haloProxy` | [`HaloProxy`](dxos_client.HaloProxy.md) |

#### Defined in

[packages/sdk/client/src/packlets/proxy/echo-proxy.ts:32](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/echo-proxy.ts#L32)

## Properties

### \_modelFactory

• `Private` `Readonly` **\_modelFactory**: `ModelFactory`

#### Defined in

[packages/sdk/client/src/packlets/proxy/echo-proxy.ts:30](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/echo-proxy.ts#L30)

___

### \_parties

• `Private` `Readonly` **\_parties**: `ComplexMap`<`PublicKey`, [`PartyProxy`](dxos_client.PartyProxy.md)\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/echo-proxy.ts:27](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/echo-proxy.ts#L27)

___

### \_partiesChanged

• `Private` `Readonly` **\_partiesChanged**: `Event`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/echo-proxy.ts:28](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/echo-proxy.ts#L28)

___

### \_subscriptions

• `Private` `Readonly` **\_subscriptions**: `SubscriptionGroup`

#### Defined in

[packages/sdk/client/src/packlets/proxy/echo-proxy.ts:29](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/echo-proxy.ts#L29)

## Accessors

### info

• `get` **info**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `parties` | `number` |

#### Implementation of

[Echo](../interfaces/dxos_client.Echo.md).[info](../interfaces/dxos_client.Echo.md#info)

#### Defined in

[packages/sdk/client/src/packlets/proxy/echo-proxy.ts:61](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/echo-proxy.ts#L61)

___

### modelFactory

• `get` **modelFactory**(): `ModelFactory`

#### Returns

`ModelFactory`

#### Defined in

[packages/sdk/client/src/packlets/proxy/echo-proxy.ts:47](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/echo-proxy.ts#L47)

___

### networkManager

• `get` **networkManager**(): `any`

#### Returns

`any`

#### Defined in

[packages/sdk/client/src/packlets/proxy/echo-proxy.ts:51](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/echo-proxy.ts#L51)

## Methods

### acceptInvitation

▸ **acceptInvitation**(`invitationDescriptor`): [`PartyInvitation`](dxos_client.PartyInvitation.md)

Joins an existing Party by invitation.

To be used with `party.createInvitation` on the inviter side.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](dxos_client.InvitationDescriptor.md) |

#### Returns

[`PartyInvitation`](dxos_client.PartyInvitation.md)

#### Implementation of

[Echo](../interfaces/dxos_client.Echo.md).[acceptInvitation](../interfaces/dxos_client.Echo.md#acceptinvitation)

#### Defined in

[packages/sdk/client/src/packlets/proxy/echo-proxy.ts:197](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/echo-proxy.ts#L197)

___

### cloneParty

▸ **cloneParty**(`snapshot`): `Promise`<[`Party`](../interfaces/dxos_client.Party.md)\>

Clones the party from a snapshot.

#### Parameters

| Name | Type |
| :------ | :------ |
| `snapshot` | `PartySnapshot` |

#### Returns

`Promise`<[`Party`](../interfaces/dxos_client.Party.md)\>

#### Implementation of

[Echo](../interfaces/dxos_client.Echo.md).[cloneParty](../interfaces/dxos_client.Echo.md#cloneparty)

#### Defined in

[packages/sdk/client/src/packlets/proxy/echo-proxy.ts:158](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/echo-proxy.ts#L158)

___

### createParty

▸ **createParty**(): `Promise`<[`Party`](../interfaces/dxos_client.Party.md)\>

Creates a new party.

#### Returns

`Promise`<[`Party`](../interfaces/dxos_client.Party.md)\>

#### Implementation of

[Echo](../interfaces/dxos_client.Echo.md).[createParty](../interfaces/dxos_client.Echo.md#createparty)

#### Defined in

[packages/sdk/client/src/packlets/proxy/echo-proxy.ts:135](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/echo-proxy.ts#L135)

___

### getParty

▸ **getParty**(`partyKey`): `undefined` \| [`Party`](../interfaces/dxos_client.Party.md)

Returns an individual party by its key.

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |

#### Returns

`undefined` \| [`Party`](../interfaces/dxos_client.Party.md)

#### Implementation of

[Echo](../interfaces/dxos_client.Echo.md).[getParty](../interfaces/dxos_client.Echo.md#getparty)

#### Defined in

[packages/sdk/client/src/packlets/proxy/echo-proxy.ts:181](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/echo-proxy.ts#L181)

___

### queryParties

▸ **queryParties**(): [`ResultSet`](dxos_client.ResultSet.md)<[`Party`](../interfaces/dxos_client.Party.md)\>

#### Returns

[`ResultSet`](dxos_client.ResultSet.md)<[`Party`](../interfaces/dxos_client.Party.md)\>

#### Implementation of

[Echo](../interfaces/dxos_client.Echo.md).[queryParties](../interfaces/dxos_client.Echo.md#queryparties)

#### Defined in

[packages/sdk/client/src/packlets/proxy/echo-proxy.ts:188](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/echo-proxy.ts#L188)

___

### registerModel

▸ **registerModel**(`constructor`): [`EchoProxy`](dxos_client.EchoProxy.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `constructor` | `ModelConstructor`<`any`\> |

#### Returns

[`EchoProxy`](dxos_client.EchoProxy.md)

#### Implementation of

[Echo](../interfaces/dxos_client.Echo.md).[registerModel](../interfaces/dxos_client.Echo.md#registermodel)

#### Defined in

[packages/sdk/client/src/packlets/proxy/echo-proxy.ts:67](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/echo-proxy.ts#L67)

___

### toString

▸ **toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/client/src/packlets/proxy/echo-proxy.ts:43](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/echo-proxy.ts#L43)
