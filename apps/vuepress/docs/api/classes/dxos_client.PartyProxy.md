# Class: PartyProxy

[@dxos/client](../modules/dxos_client.md).PartyProxy

Main public Party API.
Proxies requests to local/remove services.

## Implements

- [`Party`](../interfaces/dxos_client.Party.md)

## Table of contents

### Properties

- [\_database](dxos_client.PartyProxy.md#_database)
- [\_invitationProxy](dxos_client.PartyProxy.md#_invitationproxy)
- [\_isActive](dxos_client.PartyProxy.md#_isactive)
- [\_isOpen](dxos_client.PartyProxy.md#_isopen)
- [\_item](dxos_client.PartyProxy.md#_item)
- [\_key](dxos_client.PartyProxy.md#_key)

### Accessors

- [database](dxos_client.PartyProxy.md#database)
- [invitationProxy](dxos_client.PartyProxy.md#invitationproxy)
- [isActive](dxos_client.PartyProxy.md#isactive)
- [isOpen](dxos_client.PartyProxy.md#isopen)
- [key](dxos_client.PartyProxy.md#key)
- [properties](dxos_client.PartyProxy.md#properties)
- [reduce](dxos_client.PartyProxy.md#reduce)
- [select](dxos_client.PartyProxy.md#select)

### Methods

- [\_setOpen](dxos_client.PartyProxy.md#_setopen)
- [close](dxos_client.PartyProxy.md#close)
- [createInvitation](dxos_client.PartyProxy.md#createinvitation)
- [createSnapshot](dxos_client.PartyProxy.md#createsnapshot)
- [destroy](dxos_client.PartyProxy.md#destroy)
- [getDetails](dxos_client.PartyProxy.md#getdetails)
- [getProperty](dxos_client.PartyProxy.md#getproperty)
- [getTitle](dxos_client.PartyProxy.md#gettitle)
- [initialize](dxos_client.PartyProxy.md#initialize)
- [open](dxos_client.PartyProxy.md#open)
- [queryMembers](dxos_client.PartyProxy.md#querymembers)
- [setActive](dxos_client.PartyProxy.md#setactive)
- [setProperty](dxos_client.PartyProxy.md#setproperty)
- [setTitle](dxos_client.PartyProxy.md#settitle)

## Properties

### \_database

• `Private` `Optional` `Readonly` **\_database**: [`Database`](dxos_client.Database.md)

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:31](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L31)

___

### \_invitationProxy

• `Private` `Readonly` **\_invitationProxy**: [`InvitationProxy`](dxos_client.InvitationProxy.md)

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:32](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L32)

___

### \_isActive

• `Private` **\_isActive**: `boolean`

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:36](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L36)

___

### \_isOpen

• `Private` **\_isOpen**: `boolean`

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:35](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L35)

___

### \_item

• `Private` `Optional` **\_item**: [`Item`](dxos_client.Item.md)<[`ObjectModel`](dxos_client.ObjectModel.md)\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:37](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L37)

___

### \_key

• `Private` **\_key**: `PublicKey`

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:34](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L34)

## Accessors

### database

• `get` **database**(): [`Database`](dxos_client.Database.md)

#### Returns

[`Database`](dxos_client.Database.md)

#### Implementation of

Party.database

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:88](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L88)

___

### invitationProxy

• `get` **invitationProxy**(): [`InvitationProxy`](dxos_client.InvitationProxy.md)

#### Returns

[`InvitationProxy`](dxos_client.InvitationProxy.md)

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:71](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L71)

___

### isActive

• `get` **isActive**(): `boolean`

#### Returns

`boolean`

#### Implementation of

Party.isActive

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:83](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L83)

___

### isOpen

• `get` **isOpen**(): `boolean`

#### Returns

`boolean`

#### Implementation of

Party.isOpen

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:79](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L79)

___

### key

• `get` **key**(): `PublicKey`

#### Returns

`PublicKey`

#### Implementation of

Party.key

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:75](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L75)

___

### properties

• `get` **properties**(): `ObjectProperties`

#### Returns

`ObjectProperties`

#### Implementation of

Party.properties

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:161](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L161)

___

### reduce

• `get` **reduce**(): <R\>(`result`: `R`, `filter?`: `RootFilter`) => [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\>

Returns a selection context, which can be used to traverse the object graph.

#### Returns

`fn`

▸ <`R`\>(`result`, `filter?`): [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\>

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

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:106](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L106)

___

### select

• `get` **select**(): (`filter?`: `RootFilter`) => [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `void`\>

Returns a selection context, which can be used to traverse the object graph.

#### Returns

`fn`

▸ (`filter?`): [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `void`\>

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

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:99](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L99)

## Methods

### \_setOpen

▸ **_setOpen**(`open`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `open` | `boolean` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:143](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L143)

___

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[close](../interfaces/dxos_client.Party.md#close)

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:135](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L135)

___

### createInvitation

▸ **createInvitation**(`inviteeKey?`): `Promise`<[`InvitationRequest`](dxos_client.InvitationRequest.md)\>

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

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:215](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L215)

___

### createSnapshot

▸ **createSnapshot**(): `Promise`<`PartySnapshot`\>

Implementation method.

#### Returns

`Promise`<`PartySnapshot`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[createSnapshot](../interfaces/dxos_client.Party.md#createsnapshot)

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:223](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L223)

___

### destroy

▸ **destroy**(): `Promise`<`void`\>

Called by EchoProxy close.

#### Returns

`Promise`<`void`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[destroy](../interfaces/dxos_client.Party.md#destroy)

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:125](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L125)

___

### getDetails

▸ **getDetails**(): `Promise`<`PartyDetails`\>

#### Returns

`Promise`<`PartyDetails`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[getDetails](../interfaces/dxos_client.Party.md#getdetails)

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:139](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L139)

___

### getProperty

▸ **getProperty**(`key`, `defaultValue?`): `any`

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

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:189](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L189)

___

### getTitle

▸ **getTitle**(): `any`

**`Deprecated`**

Use party.properties.

#### Returns

`any`

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[getTitle](../interfaces/dxos_client.Party.md#gettitle)

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:175](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L175)

___

### initialize

▸ **initialize**(): `Promise`<`void`\>

Called by EchoProxy open.

#### Returns

`Promise`<`void`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[initialize](../interfaces/dxos_client.Party.md#initialize)

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:113](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L113)

___

### open

▸ **open**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[open](../interfaces/dxos_client.Party.md#open)

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:131](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L131)

___

### queryMembers

▸ **queryMembers**(): [`ResultSet`](dxos_client.ResultSet.md)<`PartyMember`\>

Return set of party members.

#### Returns

[`ResultSet`](dxos_client.ResultSet.md)<`PartyMember`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[queryMembers](../interfaces/dxos_client.Party.md#querymembers)

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:197](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L197)

___

### setActive

▸ **setActive**(`active`, `options`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `active` | `boolean` |
| `options` | `ActivationOptions` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[Party](../interfaces/dxos_client.Party.md).[setActive](../interfaces/dxos_client.Party.md#setactive)

#### Defined in

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:151](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L151)

___

### setProperty

▸ **setProperty**(`key`, `value?`): `Promise`<`void`\>

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

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:182](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L182)

___

### setTitle

▸ **setTitle**(`title`): `Promise`<`void`\>

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

[packages/sdk/client/src/packlets/proxy/party-proxy.ts:168](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/party-proxy.ts#L168)
