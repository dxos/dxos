# Class: Keyring

[@dxos/credentials](../modules/dxos_credentials.md).Keyring

A class for generating and managing keys, signing and verifying messages with them.
NOTE: This implements a write-through cache.

## Implements

- [`Signer`](../interfaces/dxos_credentials.Signer.md)

## Constructors

### constructor

**new Keyring**(`keystore?`)

If no KeyStore is supplied, in-memory key storage will be used.

#### Parameters

| Name | Type |
| :------ | :------ |
| `keystore?` | [`KeyStore`](dxos_credentials.KeyStore.md) |

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:295](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L295)

## Properties

### \_findTrustedCache

 `Private` `Readonly` **\_findTrustedCache**: `Map`<`string`, `PublicKeyLike`\>

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:285](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L285)

___

### \_keyCache

 `Private` `Readonly` **\_keyCache**: `Map`<`string`, `any`\>

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:284](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L284)

___

### \_keystore

 `Private` `Readonly` **\_keystore**: [`KeyStore`](dxos_credentials.KeyStore.md)

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:283](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L283)

___

### keysUpdate

 `Readonly` **keysUpdate**: `Event`<`KeyRecord`[]\>

Event that is called on all key changes with updated array of keys.

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:290](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L290)

___

### \_signatureValidationCache

 `Static` **\_signatureValidationCache**: `SignatureValidationCache`

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:79](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L79)

## Accessors

### keys

`get` **keys**(): `KeyRecord`[]

All keys as an array.

#### Returns

`KeyRecord`[]

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:302](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L302)

## Methods

### \_addKeyRecord

`Private` **_addKeyRecord**(`keyRecord`, `overwrite?`): `Promise`<`KeyRecord`\>

Adds a KeyRecord to the keyring and stores it in the keystore.
The KeyRecord may contain a key pair, or only a public key.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `keyRecord` | `Omit`<`KeyRecord`, ``"key"``\> | `undefined` |  |
| `overwrite?` | `boolean` | `false` | Overwrite an existing key. |

#### Returns

`Promise`<`KeyRecord`\>

A copy of the KeyRecord, minus secrets.

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:369](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L369)

___

### \_addTempKeyRecord

`Private` **_addTempKeyRecord**(`keyRecord`, `overwrite?`): `KeyRecord`

Adds a temporary KeyRecord to the keyring.  The key is not stored to the KeyStore.
The KeyRecord may contain a key pair, or only a public key.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `keyRecord` | `Omit`<`KeyRecord`, ``"key"``\> | `undefined` |  |
| `overwrite?` | `boolean` | `false` | Overwrite an existing key. |

#### Returns

`KeyRecord`

A copy of the KeyRecord, minus secrets.

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:393](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L393)

___

### \_findFullKey

`Private` **_findFullKey**(...`filters`): `undefined` \| `KeyRecord`

Find one key matching the indicated criteria: 'party', 'type', etc.

#### Parameters

| Name | Type |
| :------ | :------ |
| `...filters` | [`FilterFunction`](../types/dxos_credentials.FilterFunction.md)[] |

#### Returns

`undefined` \| `KeyRecord`

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:530](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L530)

___

### \_findFullKeys

`Private` **_findFullKeys**(...`filters`): `KeyRecord`[]

Find all keys matching the indicated criteria: 'key', 'type', 'own', etc.

#### Parameters

| Name | Type |
| :------ | :------ |
| `...filters` | [`FilterFunction`](../types/dxos_credentials.FilterFunction.md)[] |

#### Returns

`KeyRecord`[]

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:512](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L512)

___

### addKeyRecord

**addKeyRecord**(`keyRecord`): `Promise`<`KeyRecord`\>

Adds a keyRecord that must contain a key pair (publicKey/secretKey).

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyRecord` | `Omit`<`KeyRecord`, ``"key"``\> |

#### Returns

`Promise`<`KeyRecord`\>

A copy of the KeyRecord, without secrets.

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:341](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L341)

___

### addPublicKey

**addPublicKey**(`keyRecord`): `Promise`<`KeyRecord`\>

Adds the KeyRecord that must contain a publicKey but no secretKey.

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyRecord` | `Omit`<`KeyRecord`, ``"key"`` \| ``"secretKey"``\> |

#### Returns

`Promise`<`KeyRecord`\>

A copy of the KeyRecord.

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:353](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L353)

___

### createKeyRecord

**createKeyRecord**(`attributes?`): `Promise`<`KeyRecord`\>

Creates a new public/private key pair and stores in a new KeyRecord with the supplied attributes.
Secret key is removed from the returned version of the KeyRecord.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `attributes` | `Object` | see KeyRecord definition for valid attributes. |

#### Returns

`Promise`<`KeyRecord`\>

New KeyRecord, without secretKey

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:627](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L627)

___

### deleteAllKeyRecords

**deleteAllKeyRecords**(): `Promise`<`void`\>

Delete every keyRecord. Safe to continue to use the object.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:324](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L324)

___

### deleteSecretKey

**deleteSecretKey**(`keyRecord`): `Promise`<`void`\>

Deletes the secretKey from a stored KeyRecord.

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyRecord` | `KeyRecord` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:438](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L438)

___

### export

**export**(): `Object`

Export the Keyring contents.

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `keys` | `KeyRecord`[] |

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:600](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L600)

___

### findKey

**findKey**(...`filters`): `undefined` \| `KeyRecord`

Find one key matching the indicated criteria: 'party', 'type', etc.
Secret key is removed from the returned version of the KeyRecord.

#### Parameters

| Name | Type |
| :------ | :------ |
| `...filters` | [`FilterFunction`](../types/dxos_credentials.FilterFunction.md)[] |

#### Returns

`undefined` \| `KeyRecord`

KeyRecord, without secretKey

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:543](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L543)

___

### findKeys

**findKeys**(...`filters`): `KeyRecord`[]

Find all keys matching the indicated criteria: 'key', 'type', 'own', etc.
Secret keys are removed from the returned version of the KeyRecords.

#### Parameters

| Name | Type |
| :------ | :------ |
| `...filters` | [`FilterFunction`](../types/dxos_credentials.FilterFunction.md)[] |

#### Returns

`KeyRecord`[]

KeyRecords, without secretKeys

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:522](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L522)

___

### findTrusted

**findTrusted**(`chain`): `undefined` \| `KeyRecord`

Find the first trusted key in the KeyChain, working from tip to root. For example, if the KeyChain has
keys: D->C->B->A and the Keyring trusted D, that would be returned. But if it did not trust D, but did trust
C, then C would, and so forth back to the root (A).

#### Parameters

| Name | Type |
| :------ | :------ |
| `chain` | `KeyChain` |

#### Returns

`undefined` \| `KeyRecord`

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:726](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L726)

___

### getFullKey

**getFullKey**(`publicKey`): `undefined` \| `KeyRecord`

Return the keyRecord from the keyring, if present.

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicKey` | `PublicKeyLike` |

#### Returns

`undefined` \| `KeyRecord`

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:488](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L488)

___

### getKey

**getKey**(`publicKey`): `undefined` \| `KeyRecord`

Return the keyRecord from the keyring, if present.
Secret key is removed from the returned version of the KeyRecord.

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicKey` | `PublicKeyLike` |

#### Returns

`undefined` \| `KeyRecord`

KeyRecord, without secretKey

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:501](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L501)

___

### hasKey

**hasKey**(`publicKey`): `boolean`

Is the publicKey in the keyring?

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicKey` | `PublicKeyLike` |

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:468](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L468)

___

### hasSecretKey

**hasSecretKey**(`keyRecord`): `boolean`

Returns true if the stored KeyRecord has a secretKey available.

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyRecord` | `KeyRecord` \| `KeyChain` |

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:455](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L455)

___

### import

**import**(`records`): `Promise`<`void`\>

Import KeyRecords into the KeyRing.

#### Parameters

| Name | Type |
| :------ | :------ |
| `records` | `KeyRecordList` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:609](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L609)

___

### isTrusted

**isTrusted**(`publicKey`): `boolean`

Tests if the given key is trusted.

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicKey` | `PublicKeyLike` |

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:478](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L478)

___

### load

**load**(): `Promise`<[`Keyring`](dxos_credentials.Keyring.md)\>

Load keys from the KeyStore.  This call is required when using a persistent KeyStore.

#### Returns

`Promise`<[`Keyring`](dxos_credentials.Keyring.md)\>

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:309](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L309)

___

### loadJSON

**loadJSON**(`value`): `Promise`<`any`[]\>

Load keys from supplied JSON into the Keyring.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `string` |

#### Returns

`Promise`<`any`[]\>

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:576](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L576)

___

### metrics

**metrics**(): `Object`

Application-wide Keyring metrics.

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `keyring` | [`SimpleMetrics`](dxos_credentials.SimpleMetrics.md) |
| `sigCache` | [`SimpleMetrics`](dxos_credentials.SimpleMetrics.md) |

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:811](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L811)

___

### rawSign

**rawSign**(`data`, `keyRecord`): `Buffer`

Sign the data with the indicated key and return the signature.
KeyChains are not supported.

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `Buffer` |
| `keyRecord` | `KeyRecord` |

#### Returns

`Buffer`

#### Implementation of

[Signer](../interfaces/dxos_credentials.Signer.md).[rawSign](../interfaces/dxos_credentials.Signer.md#rawsign)

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:667](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L667)

___

### sign

**sign**(`message`, `keys`, `nonce?`, `created?`): `WithTypeUrl`<`SignedMessage`\>

Sign the message with the indicated key or keys. The returned signed object will be of the form:
{
  signed: { ... }, // The message as signed, including timestamp and nonce.
  signatures: []   // An array with signature and publicKey of each signing key.
}

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |
| `keys` | (`PublicKey` \| `KeyRecord` \| `KeyChain`)[] |
| `nonce?` | `Buffer` |
| `created?` | `string` |

#### Returns

`WithTypeUrl`<`SignedMessage`\>

#### Implementation of

[Signer](../interfaces/dxos_credentials.Signer.md).[sign](../interfaces/dxos_credentials.Signer.md#sign)

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:642](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L642)

___

### toJSON

**toJSON**(): `string`

Serialize the Keyring contents to JSON.

#### Returns

`string`

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:552](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L552)

___

### updateKey

**updateKey**(`keyRecord`): `Promise`<`KeyRecord`\>

Adds or updates a KeyRecord. The KeyRecord must contain a publicKey and it may contain a secretKey.
If the KeyRecord already exists, the secretKey will NOT be updated.

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyRecord` | `KeyRecord` |

#### Returns

`Promise`<`KeyRecord`\>

A copy of the KeyRecord, without secrets.

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:414](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L414)

___

### verify

**verify**(`message`, `options?`): `boolean`

Verify all the signatures on a signed message.
By default, at least ONE of the signing keys must be a known, trusted key.
If `requireAllKeysBeTrusted` is true, ALL keys must be known and trusted.

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `SignedMessage` |
| `options` | `Object` |
| `options.allowKeyChains` | `undefined` \| `boolean` |
| `options.requireAllKeysBeTrusted` | `undefined` \| `boolean` |

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:688](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L688)

___

### buildKeyChain

`Static` **buildKeyChain**(`publicKey`, `signedMessageMap`, `exclude?`): `KeyChain`

Builds up a KeyChain for `publicKey` from the supplied SignedMessages. The message map should be indexed
by the hexlified PublicKeyLike. If a single message admits more than one key, it should have a map entry for each.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `publicKey` | `PublicKeyLike` | `undefined` |  |
| `signedMessageMap` | `Map`<`string`, `Message` \| `SignedMessage`\> | `undefined` |  |
| `exclude` | `PublicKey`[] | `[]` | Keys which should be excluded from the chain, for example, excluding FEED keys when building up a chain for a DEVICE. |

#### Returns

`KeyChain`

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:157](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L157)

___

### cryptoSign

`Static` **cryptoSign**(`message`, `secretkey`): `Buffer`

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Buffer` |
| `secretkey` | `Buffer` |

#### Returns

`Buffer`

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:88](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L88)

___

### cryptoVerify

`Static` **cryptoVerify**(`message`, `signature`, `publicKey`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Buffer` |
| `signature` | `Buffer` |
| `publicKey` | `Buffer` |

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:83](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L83)

___

### signMessage

`Static` **signMessage**(`message`, `keys`, `keyChainMap`, `nonce?`, `created?`): `WithTypeUrl`<`SignedMessage`\>

Sign the message with the indicated key or keys. The returned signed object will be of the form:
{
  signed: { ... }, // The message as signed, including timestamp and nonce.
  signatures: []   // An array with signature and publicKey of each signing key.
}

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |
| `keys` | `KeyRecord`[] |
| `keyChainMap` | `Map`<`string`, `KeyChain`\> |
| `nonce?` | `Buffer` |
| `created?` | `string` |

#### Returns

`WithTypeUrl`<`SignedMessage`\>

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:100](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L100)

___

### signingFilter

`Static` **signingFilter**(`attributes?`): [`FilterFunction`](../types/dxos_credentials.FilterFunction.md)

Creates a search filter for a key that can be used for signing.

#### Parameters

| Name | Type |
| :------ | :------ |
| `attributes` | `Partial`<`KeyRecord`\> |

#### Returns

[`FilterFunction`](../types/dxos_credentials.FilterFunction.md)

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:271](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L271)

___

### signingKeys

`Static` **signingKeys**(`message`, `__namedParameters?`): `PublicKey`[]

What keys were used to sign this message?

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `SignedMessage` |
| `__namedParameters` | `Object` |
| `__namedParameters.deep` | `undefined` \| `boolean` |
| `__namedParameters.validate` | `undefined` \| `boolean` |

#### Returns

`PublicKey`[]

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:201](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L201)

___

### validateSignature

`Static` **validateSignature**(`message`, `signature`, `key`): `boolean`

Validates a single signature on a message.
This does not check that the key is trusted, only that the signature is valid.

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |
| `signature` | `Uint8Array` |
| `key` | `PublicKeyLike` |

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:253](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L253)

___

### validateSignatures

`Static` **validateSignatures**(`message`): `boolean`

Validate all the signatures on a signed message.
This does not check that the keys are trusted, only that the signatures are valid.

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Message` \| `SignedMessage` |

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/keys/keyring.ts:233](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring.ts#L233)
