# Interface: Party

[@dxos/client](../modules/dxos_client.md).Party

Party API.

## Implemented by

- [`PartyProxy`](../classes/dxos_client.PartyProxy.md)

## Accessors

### database

`get` **database**(): [`Database`](../classes/dxos_client.Database.md)

#### Returns

[`Database`](../classes/dxos_client.Database.md)

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:31](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L31)

___

### is_active

`get` **is_active**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:28](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L28)

___

### is_open

`get` **is_open**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:27](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L27)

___

### key

`get` **key**(): [`PublicKey`](../classes/dxos_client.PublicKey.md)

#### Returns

[`PublicKey`](../classes/dxos_client.PublicKey.md)

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:26](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L26)

___

### properties

`get` **properties**(): `ObjectProperties`

#### Returns

`ObjectProperties`

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:48](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L48)

___

### reduce

`get` **reduce**(): <R\>(`result`: `R`, `filter?`: `RootFilter`) => [`Selection`](../classes/dxos_client.Selection.md)<[`Item`](../classes/dxos_client.Item.md)<`any`\>, `R`\>

#### Returns

`fn`

<`R`\>(`result`, `filter?`): [`Selection`](../classes/dxos_client.Selection.md)<[`Item`](../classes/dxos_client.Item.md)<`any`\>, `R`\>

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

[`Selection`](../classes/dxos_client.Selection.md)<[`Item`](../classes/dxos_client.Item.md)<`any`\>, `R`\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:33](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L33)

___

### select

`get` **select**(): (`filter?`: `RootFilter`) => [`Selection`](../classes/dxos_client.Selection.md)<[`Item`](../classes/dxos_client.Item.md)<`any`\>, `void`\>

#### Returns

`fn`

(`filter?`): [`Selection`](../classes/dxos_client.Selection.md)<[`Item`](../classes/dxos_client.Item.md)<`any`\>, `void`\>

Returns a selection context, which can be used to traverse the object graph.

##### Parameters

| Name | Type |
| :------ | :------ |
| `filter?` | `RootFilter` |

##### Returns

[`Selection`](../classes/dxos_client.Selection.md)<[`Item`](../classes/dxos_client.Item.md)<`any`\>, `void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:32](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L32)

## Methods

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:39](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L39)

___

### createInvitation

**createInvitation**(`options?`): `Promise`<[`InvitationRequest`](../classes/dxos_client.InvitationRequest.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | [`CreationInvitationOptions`](dxos_client.CreationInvitationOptions.md) |

#### Returns

`Promise`<[`InvitationRequest`](../classes/dxos_client.InvitationRequest.md)\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:59](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L59)

___

### createSnapshot

**createSnapshot**(): `Promise`<`PartySnapshot`\>

#### Returns

`Promise`<`PartySnapshot`\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:61](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L61)

___

### destroy

**destroy**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:36](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L36)

___

### getDetails

**getDetails**(): `Promise`<`PartyDetails`\>

#### Returns

`Promise`<`PartyDetails`\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:46](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L46)

___

### getProperty

**getProperty**(`key`, `defaultValue?`): `any`

**`Deprecated`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `defaultValue?` | `any` |

#### Returns

`any`

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:56](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L56)

___

### getTitle

**getTitle**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:43](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L43)

___

### initialize

**initialize**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:35](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L35)

___

### open

**open**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:38](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L38)

___

### queryMembers

**queryMembers**(): [`ResultSet`](../classes/dxos_client.ResultSet.md)<`any`\>

#### Returns

[`ResultSet`](../classes/dxos_client.ResultSet.md)<`any`\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:58](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L58)

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

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:40](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L40)

___

### setProperty

**setProperty**(`key`, `value?`): `Promise`<`void`\>

**`Deprecated`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value?` | `any` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:52](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L52)

___

### setTitle

**setTitle**(`title`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `title` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:42](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L42)
