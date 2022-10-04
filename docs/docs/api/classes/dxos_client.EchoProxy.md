# Class: EchoProxy

[@dxos/client](../modules/dxos_client.md).EchoProxy

Client proxy to local/remote ECHO service.

## Implements

- [`Echo`](../interfaces/dxos_client.Echo.md)

## Constructors

### constructor

**new EchoProxy**(`_serviceProvider`, `_haloProxy`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_serviceProvider` | `ClientServiceProvider` |
| `_haloProxy` | [`HaloProxy`](dxos_client.HaloProxy.md) |

#### Defined in

[packages/sdk/client/src/packlets/proxies/echo-proxy.ts:32](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L32)

## Properties

### \_modelFactory

 `Private` `Readonly` **\_modelFactory**: `ModelFactory`

#### Defined in

[packages/sdk/client/src/packlets/proxies/echo-proxy.ts:30](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L30)

___

### \_parties

 `Private` `Readonly` **\_parties**: `ComplexMap`<[`PublicKey`](dxos_client.PublicKey.md), [`PartyProxy`](dxos_client.PartyProxy.md)\>

#### Defined in

[packages/sdk/client/src/packlets/proxies/echo-proxy.ts:27](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L27)

___

### \_partiesChanged

 `Private` `Readonly` **\_partiesChanged**: `Event`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxies/echo-proxy.ts:28](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L28)

___

### \_subscriptions

 `Private` `Readonly` **\_subscriptions**: `SubscriptionGroup`

#### Defined in

[packages/sdk/client/src/packlets/proxies/echo-proxy.ts:29](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L29)

## Accessors

### info

`get` **info**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `parties` | `number` |

#### Implementation of

[Echo](../interfaces/dxos_client.Echo.md).[info](../interfaces/dxos_client.Echo.md#info)

#### Defined in

[packages/sdk/client/src/packlets/proxies/echo-proxy.ts:63](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L63)

___

### modelFactory

`get` **modelFactory**(): `ModelFactory`

#### Returns

`ModelFactory`

#### Defined in

[packages/sdk/client/src/packlets/proxies/echo-proxy.ts:49](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L49)

___

### networkManager

`get` **networkManager**(): `any`

#### Returns

`any`

#### Defined in

[packages/sdk/client/src/packlets/proxies/echo-proxy.ts:53](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L53)

## Methods

### acceptInvitation

**acceptInvitation**(`invitationDescriptor`): [`PartyInvitation`](dxos_client.PartyInvitation.md)

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

[packages/sdk/client/src/packlets/proxies/echo-proxy.ts:199](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L199)

___

### cloneParty

**cloneParty**(`snapshot`): `Promise`<[`Party`](../interfaces/dxos_client.Party.md)\>

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

[packages/sdk/client/src/packlets/proxies/echo-proxy.ts:160](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L160)

___

### createParty

**createParty**(): `Promise`<[`Party`](../interfaces/dxos_client.Party.md)\>

Creates a new party.

#### Returns

`Promise`<[`Party`](../interfaces/dxos_client.Party.md)\>

#### Implementation of

[Echo](../interfaces/dxos_client.Echo.md).[createParty](../interfaces/dxos_client.Echo.md#createparty)

#### Defined in

[packages/sdk/client/src/packlets/proxies/echo-proxy.ts:137](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L137)

___

### getParty

**getParty**(`party_key`): `undefined` \| [`Party`](../interfaces/dxos_client.Party.md)

Returns an individual party by its key.

#### Parameters

| Name | Type |
| :------ | :------ |
| `party_key` | [`PublicKey`](dxos_client.PublicKey.md) |

#### Returns

`undefined` \| [`Party`](../interfaces/dxos_client.Party.md)

#### Implementation of

[Echo](../interfaces/dxos_client.Echo.md).[getParty](../interfaces/dxos_client.Echo.md#getparty)

#### Defined in

[packages/sdk/client/src/packlets/proxies/echo-proxy.ts:183](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L183)

___

### queryParties

**queryParties**(): [`ResultSet`](dxos_client.ResultSet.md)<[`Party`](../interfaces/dxos_client.Party.md)\>

#### Returns

[`ResultSet`](dxos_client.ResultSet.md)<[`Party`](../interfaces/dxos_client.Party.md)\>

#### Implementation of

[Echo](../interfaces/dxos_client.Echo.md).[queryParties](../interfaces/dxos_client.Echo.md#queryparties)

#### Defined in

[packages/sdk/client/src/packlets/proxies/echo-proxy.ts:190](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L190)

___

### registerModel

**registerModel**(`constructor`): [`EchoProxy`](dxos_client.EchoProxy.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `constructor` | `ModelConstructor`<`any`\> |

#### Returns

[`EchoProxy`](dxos_client.EchoProxy.md)

#### Implementation of

[Echo](../interfaces/dxos_client.Echo.md).[registerModel](../interfaces/dxos_client.Echo.md#registermodel)

#### Defined in

[packages/sdk/client/src/packlets/proxies/echo-proxy.ts:69](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L69)

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/client/src/packlets/proxies/echo-proxy.ts:45](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L45)
