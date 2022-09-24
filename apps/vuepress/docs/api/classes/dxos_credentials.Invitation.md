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

## Table of contents

### Constructors

- [constructor](dxos_credentials.Invitation.md#constructor)

### Properties

- [\_authNonce](dxos_credentials.Invitation.md#_authnonce)
- [\_began](dxos_credentials.Invitation.md#_began)
- [\_expiration](dxos_credentials.Invitation.md#_expiration)
- [\_finished](dxos_credentials.Invitation.md#_finished)
- [\_handshook](dxos_credentials.Invitation.md#_handshook)
- [\_id](dxos_credentials.Invitation.md#_id)
- [\_issued](dxos_credentials.Invitation.md#_issued)
- [\_nonce](dxos_credentials.Invitation.md#_nonce)
- [\_notarized](dxos_credentials.Invitation.md#_notarized)
- [\_onFinish](dxos_credentials.Invitation.md#_onfinish)
- [\_partyKey](dxos_credentials.Invitation.md#_partykey)
- [\_revoked](dxos_credentials.Invitation.md#_revoked)
- [\_secret](dxos_credentials.Invitation.md#_secret)
- [\_secretProvider](dxos_credentials.Invitation.md#_secretprovider)
- [\_secretValidator](dxos_credentials.Invitation.md#_secretvalidator)

### Accessors

- [authNonce](dxos_credentials.Invitation.md#authnonce)
- [began](dxos_credentials.Invitation.md#began)
- [expired](dxos_credentials.Invitation.md#expired)
- [finished](dxos_credentials.Invitation.md#finished)
- [handshook](dxos_credentials.Invitation.md#handshook)
- [id](dxos_credentials.Invitation.md#id)
- [issued](dxos_credentials.Invitation.md#issued)
- [live](dxos_credentials.Invitation.md#live)
- [nonce](dxos_credentials.Invitation.md#nonce)
- [notarized](dxos_credentials.Invitation.md#notarized)
- [partyKey](dxos_credentials.Invitation.md#partykey)
- [revoked](dxos_credentials.Invitation.md#revoked)
- [secret](dxos_credentials.Invitation.md#secret)

### Methods

- [begin](dxos_credentials.Invitation.md#begin)
- [finish](dxos_credentials.Invitation.md#finish)
- [handshake](dxos_credentials.Invitation.md#handshake)
- [notarize](dxos_credentials.Invitation.md#notarize)
- [revoke](dxos_credentials.Invitation.md#revoke)
- [validate](dxos_credentials.Invitation.md#validate)

## Constructors

### constructor

• **new Invitation**(`partyKey`, `secretValidator`, `secretProvider?`, `onFinish?`, `expiration?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `partyKey` | `PublicKeyLike` | `undefined` |
| `secretValidator` | [`SecretValidator`](../modules/dxos_credentials.md#secretvalidator) | `undefined` |
| `secretProvider?` | [`SecretProvider`](../modules/dxos_credentials.md#secretprovider) | `undefined` |
| `onFinish?` | [`InvitationOnFinish`](../modules/dxos_credentials.md#invitationonfinish) | `undefined` |
| `expiration` | `number` | `0` |

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:71](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L71)

## Properties

### \_authNonce

• `Private` `Readonly` **\_authNonce**: `Buffer`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:57](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L57)

___

### \_began

• `Private` `Optional` **\_began**: `string`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:62](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L62)

___

### \_expiration

• `Private` `Optional` `Readonly` **\_expiration**: `number`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:54](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L54)

___

### \_finished

• `Private` `Optional` **\_finished**: `string`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:65](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L65)

___

### \_handshook

• `Private` `Optional` **\_handshook**: `string`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:63](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L63)

___

### \_id

• `Private` `Readonly` **\_id**: `Buffer`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:56](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L56)

___

### \_issued

• `Private` `Readonly` **\_issued**: `string`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:61](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L61)

___

### \_nonce

• `Private` `Readonly` **\_nonce**: `Buffer`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:58](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L58)

___

### \_notarized

• `Private` `Optional` **\_notarized**: `string`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:64](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L64)

___

### \_onFinish

• `Private` `Optional` `Readonly` **\_onFinish**: [`InvitationOnFinish`](../modules/dxos_credentials.md#invitationonfinish)

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:53](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L53)

___

### \_partyKey

• `Private` `Readonly` **\_partyKey**: `PublicKey`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:50](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L50)

___

### \_revoked

• `Private` `Optional` **\_revoked**: `string`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:66](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L66)

___

### \_secret

• `Private` `Optional` **\_secret**: `Buffer`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:59](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L59)

___

### \_secretProvider

• `Private` `Optional` `Readonly` **\_secretProvider**: [`SecretProvider`](../modules/dxos_credentials.md#secretprovider)

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:52](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L52)

___

### \_secretValidator

• `Private` `Readonly` **\_secretValidator**: [`SecretValidator`](../modules/dxos_credentials.md#secretvalidator)

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:51](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L51)

## Accessors

### authNonce

• `get` **authNonce**(): `Buffer`

#### Returns

`Buffer`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:87](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L87)

___

### began

• `get` **began**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:107](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L107)

___

### expired

• `get` **expired**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:127](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L127)

___

### finished

• `get` **finished**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:123](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L123)

___

### handshook

• `get` **handshook**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:115](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L115)

___

### id

• `get` **id**(): `Buffer`

#### Returns

`Buffer`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:83](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L83)

___

### issued

• `get` **issued**(): `string`

#### Returns

`string`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:99](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L99)

___

### live

• `get` **live**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:103](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L103)

___

### nonce

• `get` **nonce**(): `Buffer`

#### Returns

`Buffer`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:91](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L91)

___

### notarized

• `get` **notarized**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:111](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L111)

___

### partyKey

• `get` **partyKey**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:95](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L95)

___

### revoked

• `get` **revoked**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:119](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L119)

___

### secret

• `get` **secret**(): `undefined` \| `Buffer`

#### Returns

`undefined` \| `Buffer`

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:134](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L134)

## Methods

### begin

▸ **begin**(): `Promise`<`boolean`\>

Handles invitation presentation (ie, triggers the secretProvider) and
marks the invitation as having been presented.

#### Returns

`Promise`<`boolean`\>

true if the invitation was alive, else false

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:157](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L157)

___

### finish

▸ **finish**(): `Promise`<`boolean`\>

Marks the invitation as having been finished and triggers any
onFinish handlers if present.

#### Returns

`Promise`<`boolean`\>

true if the invitation was alive, else false

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:207](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L207)

___

### handshake

▸ **handshake**(): `Promise`<`boolean`\>

Marks the invitation as having been negotiated.

#### Returns

`Promise`<`boolean`\>

true if the invitation was alive, else false

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:178](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L178)

___

### notarize

▸ **notarize**(): `Promise`<`boolean`\>

Marks the invitation as having been submitted.

#### Returns

`Promise`<`boolean`\>

true if the invitation was alive, else false

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:192](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L192)

___

### revoke

▸ **revoke**(): `Promise`<`boolean`\>

Revokes the invitation.

#### Returns

`Promise`<`boolean`\>

true if the invitation was alive, else false

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:142](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L142)

___

### validate

▸ **validate**(`secret`): `Promise`<`boolean`\>

Returns `true` if the invitation and secret are valid, else `false`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `secret` | `Buffer` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:224](https://github.com/dxos/dxos/blob/e3b936721/packages/halo/credentials/src/greet/invitation.ts#L224)
