# Class: PartyProxy

[@dxos/client](../modules/dxos_client.md).PartyProxy

Main public Party API.
Proxies requests to local/remove services.

## Implements

- [`Party`](../interfaces/dxos_client.Party.md)

## Properties

### \_database

 `Private` `Optional` `Readonly` **\_database**: [`Database`](dxos_client.Database.md)

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:26](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L26)

___

### \_invitationProxy

 `Private` `Readonly` **\_invitationProxy**: [`InvitationProxy`](dxos_client.InvitationProxy.md)

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:27](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L27)

___

### \_isActive

 `Private` **\_isActive**: `boolean`

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:31](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L31)

___

### \_isOpen

 `Private` **\_isOpen**: `boolean`

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:30](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L30)

___

### \_item

 `Private` `Optional` **\_item**: [`Item`](dxos_client.Item.md)<[`ObjectModel`](dxos_client.ObjectModel.md)\>

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:32](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L32)

___

### \_key

 `Private` **\_key**: [`PublicKey`](dxos_client.PublicKey.md)

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:29](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L29)

## Accessors

### database

`get` **database**(): [`Database`](dxos_client.Database.md)

#### Returns

[`Database`](dxos_client.Database.md)

#### Implementation of

Party.database

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:83](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L83)

___

### invitationProxy

`get` **invitationProxy**(): [`InvitationProxy`](dxos_client.InvitationProxy.md)

#### Returns

[`InvitationProxy`](dxos_client.InvitationProxy.md)

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:66](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L66)

___

### isActive

`get` **isActive**(): `boolean`

#### Returns

`boolean`

#### Implementation of

Party.isActive

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:78](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L78)

___

### isOpen

`get` **isOpen**(): `boolean`

#### Returns

`boolean`

#### Implementation of

Party.isOpen

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:74](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L74)

___

### key

`get` **key**(): [`PublicKey`](dxos_client.PublicKey.md)

#### Returns

[`PublicKey`](dxos_client.PublicKey.md)

#### Implementation of

Party.key

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:70](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L70)

___

### properties

`get` **properties**(): `ObjectProperties`

TODO: Currently broken.

#### Returns

`ObjectProperties`

#### Implementation of

Party.properties

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:159](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L159)

___

### reduce

`get` **reduce**(): <R\>(`result`: `R`, `filter?`: `RootFilter`) => [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\>

Returns a selection context, which can be used to traverse the object graph.

#### Returns

`fn`

<`R`\>(`result`, `filter?`): [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\>

Returns a reducer selection context.

##### Type parameters

| Name |
| :------ |
| `R` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `result` | `R` |
| `filter?` | `RootFilter` |

##### Returns

[`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\>

#### Implementation of

Party.reduce

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:101](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L101)

___

### select

`get` **select**(): (`filter?`: `RootFilter`) => [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `void`\>

Returns a selection context, which can be used to traverse the object graph.

#### Returns

`fn`

(`filter?`): [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `void`\>

Returns a selection context, which can be used to traverse the object graph.

##### Parameters

| Name | Type |
| :------ | :------ |
| `filter?` | `RootFilter` |

##### Returns

[`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `void`\>

#### Implementation of

Party.select

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:94](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L94)

## Methods

### \_setOpen

**_setOpen**(`open`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `open` | `boolean` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:138](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L138)

___

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[close](../interfaces/dxos_client.Party.md#close)

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:130](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L130)

___

### createInvitation

**createInvitation**(`inviteeKey?`): `Promise`<[`InvitationRequest`](dxos_client.InvitationRequest.md)\>

Creates an invitation to a given party.
The Invitation flow requires the inviter and invitee to be online at the same time.
If the invitee is known ahead of time, `inviteeKey` can be provide to not require the secret exchange.
The invitation flow is protected by a generated pin code.

To be used with `client.echo.acceptInvitation` on the invitee side.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `inviteeKey` | [`CreationInvitationOptions`](../interfaces/dxos_client.CreationInvitationOptions.md) | Public key of the invitee. In this case no secret exchange is required,   but only the specified recipient can accept the invitation. |

#### Returns

`Promise`<[`InvitationRequest`](dxos_client.InvitationRequest.md)\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[createInvitation](../interfaces/dxos_client.Party.md#createinvitation)

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:214](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L214)

___

### createSnapshot

**createSnapshot**(): `Promise`<`PartySnapshot`\>

Implementation method.

#### Returns

`Promise`<`PartySnapshot`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[createSnapshot](../interfaces/dxos_client.Party.md#createsnapshot)

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:222](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L222)

___

### destroy

**destroy**(): `Promise`<`void`\>

Called by EchoProxy close.

#### Returns

`Promise`<`void`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[destroy](../interfaces/dxos_client.Party.md#destroy)

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:120](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L120)

___

### getDetails

**getDetails**(): `Promise`<`PartyDetails`\>

#### Returns

`Promise`<`PartyDetails`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[getDetails](../interfaces/dxos_client.Party.md#getdetails)

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:134](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L134)

___

### getProperty

**getProperty**(`key`, `defaultValue?`): `any`

**`Deprecated`**

Use party.properties.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `defaultValue?` | `any` |

#### Returns

`any`

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[getProperty](../interfaces/dxos_client.Party.md#getproperty)

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:188](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L188)

___

### getTitle

**getTitle**(): `never`

**`Deprecated`**

Use party.properties.

#### Returns

`never`

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[getTitle](../interfaces/dxos_client.Party.md#gettitle)

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:173](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L173)

___

### initialize

**initialize**(): `Promise`<`void`\>

Called by EchoProxy open.

#### Returns

`Promise`<`void`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[initialize](../interfaces/dxos_client.Party.md#initialize)

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:108](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L108)

___

### open

**open**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[open](../interfaces/dxos_client.Party.md#open)

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:126](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L126)

___

### queryMembers

**queryMembers**(): [`ResultSet`](dxos_client.ResultSet.md)<`PartyMember`\>

Return set of party members.

#### Returns

[`ResultSet`](dxos_client.ResultSet.md)<`PartyMember`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[queryMembers](../interfaces/dxos_client.Party.md#querymembers)

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:196](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L196)

___

### setActive

**setActive**(`active`, `options`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `active` | `boolean` |
| `options` | `any` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[setActive](../interfaces/dxos_client.Party.md#setactive)

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:146](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L146)

___

### setProperty

**setProperty**(`key`, `value?`): `Promise`<`void`\>

**`Deprecated`**

Use party.properties.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value?` | `any` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[setProperty](../interfaces/dxos_client.Party.md#setproperty)

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:181](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L181)

___

### setTitle

**setTitle**(`title`): `Promise`<`void`\>

**`Deprecated`**

Use party.properties.

#### Parameters

| Name | Type |
| :------ | :------ |
| `title` | `string` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[setTitle](../interfaces/dxos_client.Party.md#settitle)

#### Defined in

[packages/sdk/client/src/packlets/proxies/party-proxy.ts:166](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L166)
