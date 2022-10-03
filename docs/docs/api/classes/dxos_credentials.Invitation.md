# Class: Invitation

[@dxos/credentials](../modules/dxos_credentials.md).Invitation

Represents a single-use invitation to admit the Invitee to the Party.
During Greeting the invitation will cross through the states:

1. issued
2. presented
3. negotiated
4. submitted
5. finished

It may also be revoked at anytime.

## Constructors

### constructor

**new Invitation**(`partyKey`, `secretValidator`, `secretProvider?`, `onFinish?`, `expiration?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `partyKey` | `PublicKeyLike` | `undefined` |
| `secretValidator` | [`SecretValidator`](../types/dxos_credentials.SecretValidator.md) | `undefined` |
| `secretProvider?` | [`SecretProvider`](../types/dxos_credentials.SecretProvider.md) | `undefined` |
| `onFinish?` | [`InvitationOnFinish`](../types/dxos_credentials.InvitationOnFinish.md) | `undefined` |
| `expiration` | `number` | `0` |

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:71](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L71)

## Properties

### \_authNonce

 `Private` `Readonly` **\_authNonce**: `Buffer`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:57](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L57)

___

### \_began

 `Private` `Optional` **\_began**: `string`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:62](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L62)

___

### \_expiration

 `Private` `Optional` `Readonly` **\_expiration**: `number`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:54](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L54)

___

### \_finished

 `Private` `Optional` **\_finished**: `string`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:65](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L65)

___

### \_handshook

 `Private` `Optional` **\_handshook**: `string`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:63](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L63)

___

### \_id

 `Private` `Readonly` **\_id**: `Buffer`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:56](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L56)

___

### \_issued

 `Private` `Readonly` **\_issued**: `string`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:61](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L61)

___

### \_nonce

 `Private` `Readonly` **\_nonce**: `Buffer`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:58](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L58)

___

### \_notarized

 `Private` `Optional` **\_notarized**: `string`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:64](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L64)

___

### \_onFinish

 `Private` `Optional` `Readonly` **\_onFinish**: [`InvitationOnFinish`](../types/dxos_credentials.InvitationOnFinish.md)

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:53](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L53)

___

### \_partyKey

 `Private` `Readonly` **\_partyKey**: `PublicKey`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:50](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L50)

___

### \_revoked

 `Private` `Optional` **\_revoked**: `string`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:66](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L66)

___

### \_secret

 `Private` `Optional` **\_secret**: `Buffer`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:59](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L59)

___

### \_secretProvider

 `Private` `Optional` `Readonly` **\_secretProvider**: [`SecretProvider`](../types/dxos_credentials.SecretProvider.md)

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:52](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L52)

___

### \_secretValidator

 `Private` `Readonly` **\_secretValidator**: [`SecretValidator`](../types/dxos_credentials.SecretValidator.md)

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:51](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L51)

## Accessors

### authNonce

`get` **authNonce**(): `Buffer`

#### Returns

`Buffer`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:87](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L87)

___

### began

`get` **began**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:107](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L107)

___

### expired

`get` **expired**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:127](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L127)

___

### finished

`get` **finished**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:123](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L123)

___

### handshook

`get` **handshook**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:115](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L115)

___

### id

`get` **id**(): `Buffer`

#### Returns

`Buffer`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:83](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L83)

___

### issued

`get` **issued**(): `string`

#### Returns

`string`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:99](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L99)

___

### live

`get` **live**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:103](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L103)

___

### nonce

`get` **nonce**(): `Buffer`

#### Returns

`Buffer`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:91](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L91)

___

### notarized

`get` **notarized**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:111](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L111)

___

### partyKey

`get` **partyKey**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:95](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L95)

___

### revoked

`get` **revoked**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:119](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L119)

___

### secret

`get` **secret**(): `undefined` \| `Buffer`

#### Returns

`undefined` \| `Buffer`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:134](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L134)

## Methods

### begin

**begin**(): `Promise`<`boolean`\>

Handles invitation presentation (ie, triggers the secretProvider) and
marks the invitation as having been presented.

#### Returns

`Promise`<`boolean`\>

true if the invitation was alive, else false

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:157](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L157)

___

### finish

**finish**(): `Promise`<`boolean`\>

Marks the invitation as having been finished and triggers any
onFinish handlers if present.

#### Returns

`Promise`<`boolean`\>

true if the invitation was alive, else false

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:207](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L207)

___

### handshake

**handshake**(): `Promise`<`boolean`\>

Marks the invitation as having been negotiated.

#### Returns

`Promise`<`boolean`\>

true if the invitation was alive, else false

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:178](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L178)

___

### notarize

**notarize**(): `Promise`<`boolean`\>

Marks the invitation as having been submitted.

#### Returns

`Promise`<`boolean`\>

true if the invitation was alive, else false

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:192](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L192)

___

### revoke

**revoke**(): `Promise`<`boolean`\>

Revokes the invitation.

#### Returns

`Promise`<`boolean`\>

true if the invitation was alive, else false

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:142](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L142)

___

### validate

**validate**(`secret`): `Promise`<`boolean`\>

Returns `true` if the invitation and secret are valid, else `false`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `secret` | `Buffer` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:224](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/invitation.ts#L224)
