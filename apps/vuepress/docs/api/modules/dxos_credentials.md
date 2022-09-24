# Module: @dxos/credentials

## Table of contents

### Enumerations

- [IdentityEventType](../enums/dxos_credentials.IdentityEventType.md)
- [PartyEventType](../enums/dxos_credentials.PartyEventType.md)

### Events

- [AuthPlugin](../classes/dxos_credentials.AuthPlugin.md)
- [GreetingCommandPlugin](../classes/dxos_credentials.GreetingCommandPlugin.md)
- [IdentityMessageProcessor](../classes/dxos_credentials.IdentityMessageProcessor.md)
- [PartyState](../classes/dxos_credentials.PartyState.md)

### Classes

- [Filter](../classes/dxos_credentials.Filter.md)
- [Greeter](../classes/dxos_credentials.Greeter.md)
- [Invitation](../classes/dxos_credentials.Invitation.md)
- [KeyStore](../classes/dxos_credentials.KeyStore.md)
- [Keyring](../classes/dxos_credentials.Keyring.md)
- [PartyAuthenticator](../classes/dxos_credentials.PartyAuthenticator.md)
- [PartyInvitationClaimHandler](../classes/dxos_credentials.PartyInvitationClaimHandler.md)
- [PartyInvitationManager](../classes/dxos_credentials.PartyInvitationManager.md)
- [SimpleMetrics](../classes/dxos_credentials.SimpleMetrics.md)

### Interfaces

- [Authenticator](../interfaces/dxos_credentials.Authenticator.md)
- [SecretInfo](../interfaces/dxos_credentials.SecretInfo.md)
- [Signer](../interfaces/dxos_credentials.Signer.md)

### Type Aliases

- [FilterFunction](dxos_credentials.md#filterfunction)
- [GreetingCommandMessageHandler](dxos_credentials.md#greetingcommandmessagehandler)
- [InvitationOnFinish](dxos_credentials.md#invitationonfinish)
- [PartyInvitationGreetingHandler](dxos_credentials.md#partyinvitationgreetinghandler)
- [PartyWriter](dxos_credentials.md#partywriter)
- [SecretKey](dxos_credentials.md#secretkey)
- [SecretProvider](dxos_credentials.md#secretprovider)
- [SecretValidator](dxos_credentials.md#secretvalidator)
- [SigningKey](dxos_credentials.md#signingkey)

### Variables

- [ERR\_GREET\_ALREADY\_CONNECTED\_TO\_SWARM](dxos_credentials.md#err_greet_already_connected_to_swarm)
- [ERR\_GREET\_CONNECTED\_TO\_SWARM\_TIMEOUT](dxos_credentials.md#err_greet_connected_to_swarm_timeout)
- [ERR\_GREET\_GENERAL](dxos_credentials.md#err_greet_general)
- [ERR\_GREET\_INVALID\_COMMAND](dxos_credentials.md#err_greet_invalid_command)
- [ERR\_GREET\_INVALID\_INVITATION](dxos_credentials.md#err_greet_invalid_invitation)
- [ERR\_GREET\_INVALID\_MSG\_TYPE](dxos_credentials.md#err_greet_invalid_msg_type)
- [ERR\_GREET\_INVALID\_NONCE](dxos_credentials.md#err_greet_invalid_nonce)
- [ERR\_GREET\_INVALID\_PARTY](dxos_credentials.md#err_greet_invalid_party)
- [ERR\_GREET\_INVALID\_SIGNATURE](dxos_credentials.md#err_greet_invalid_signature)
- [ERR\_GREET\_INVALID\_STATE](dxos_credentials.md#err_greet_invalid_state)
- [IdentityEvents](dxos_credentials.md#identityevents)
- [PartyEvents](dxos_credentials.md#partyevents)
- [TYPE\_URL\_MESSAGE](dxos_credentials.md#type_url_message)
- [TYPE\_URL\_PARTY\_CREDENTIAL](dxos_credentials.md#type_url_party_credential)
- [TYPE\_URL\_PARTY\_INVITATION](dxos_credentials.md#type_url_party_invitation)
- [TYPE\_URL\_SIGNED\_MESSAGE](dxos_credentials.md#type_url_signed_message)
- [codec](dxos_credentials.md#codec)

### Functions

- [admitsKeys](dxos_credentials.md#admitskeys)
- [assertNoSecrets](dxos_credentials.md#assertnosecrets)
- [assertValidAttributes](dxos_credentials.md#assertvalidattributes)
- [assertValidKeyPair](dxos_credentials.md#assertvalidkeypair)
- [assertValidPublicKey](dxos_credentials.md#assertvalidpublickey)
- [assertValidSecretKey](dxos_credentials.md#assertvalidsecretkey)
- [canonicalStringify](dxos_credentials.md#canonicalstringify)
- [checkAndNormalizeKeyRecord](dxos_credentials.md#checkandnormalizekeyrecord)
- [codecLoop](dxos_credentials.md#codecloop)
- [createAuthMessage](dxos_credentials.md#createauthmessage)
- [createDateTimeString](dxos_credentials.md#createdatetimestring)
- [createDeviceInfoMessage](dxos_credentials.md#createdeviceinfomessage)
- [createEnvelopeMessage](dxos_credentials.md#createenvelopemessage)
- [createFeedAdmitMessage](dxos_credentials.md#createfeedadmitmessage)
- [createGreetingBeginMessage](dxos_credentials.md#creategreetingbeginmessage)
- [createGreetingClaimMessage](dxos_credentials.md#creategreetingclaimmessage)
- [createGreetingClaimResponse](dxos_credentials.md#creategreetingclaimresponse)
- [createGreetingFinishMessage](dxos_credentials.md#creategreetingfinishmessage)
- [createGreetingHandshakeMessage](dxos_credentials.md#creategreetinghandshakemessage)
- [createGreetingNotarizeMessage](dxos_credentials.md#creategreetingnotarizemessage)
- [createIdentityInfoMessage](dxos_credentials.md#createidentityinfomessage)
- [createKeyAdmitMessage](dxos_credentials.md#createkeyadmitmessage)
- [createKeyRecord](dxos_credentials.md#createkeyrecord)
- [createMeter](dxos_credentials.md#createmeter)
- [createPartyGenesisMessage](dxos_credentials.md#createpartygenesismessage)
- [createPartyInvitationMessage](dxos_credentials.md#createpartyinvitationmessage)
- [defaultSecretProvider](dxos_credentials.md#defaultsecretprovider)
- [defaultSecretValidator](dxos_credentials.md#defaultsecretvalidator)
- [extractContents](dxos_credentials.md#extractcontents)
- [generatePasscode](dxos_credentials.md#generatepasscode)
- [generateSeedPhrase](dxos_credentials.md#generateseedphrase)
- [getPartyCredentialMessageType](dxos_credentials.md#getpartycredentialmessagetype)
- [isDeviceInfoMessage](dxos_credentials.md#isdeviceinfomessage)
- [isEnvelope](dxos_credentials.md#isenvelope)
- [isIdentityInfoMessage](dxos_credentials.md#isidentityinfomessage)
- [isIdentityMessage](dxos_credentials.md#isidentitymessage)
- [isKeyChain](dxos_credentials.md#iskeychain)
- [isPartyCredentialMessage](dxos_credentials.md#ispartycredentialmessage)
- [isPartyInvitationMessage](dxos_credentials.md#ispartyinvitationmessage)
- [isSignedMessage](dxos_credentials.md#issignedmessage)
- [isValidPublicKey](dxos_credentials.md#isvalidpublickey)
- [keyPairFromSeedPhrase](dxos_credentials.md#keypairfromseedphrase)
- [keyTypeName](dxos_credentials.md#keytypename)
- [stripSecrets](dxos_credentials.md#stripsecrets)
- [unwrapEnvelopes](dxos_credentials.md#unwrapenvelopes)
- [unwrapMessage](dxos_credentials.md#unwrapmessage)
- [wrapMessage](dxos_credentials.md#wrapmessage)

## Type Aliases

### FilterFunction

Ƭ **FilterFunction**: (`obj`: `any`) => `boolean`

#### Type declaration

▸ (`obj`): `boolean`

##### Parameters

| Name | Type |
| :------ | :------ |
| `obj` | `any` |

##### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/keys/filter.ts:9](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/keys/filter.ts#L9)

___

### GreetingCommandMessageHandler

Ƭ **GreetingCommandMessageHandler**: (`message`: `any`, `remotePeerId`: `Buffer`, `peerId`: `Buffer`) => `Promise`<`any`\>

#### Type declaration

▸ (`message`, `remotePeerId`, `peerId`): `Promise`<`any`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |
| `remotePeerId` | `Buffer` |
| `peerId` | `Buffer` |

##### Returns

`Promise`<`any`\>

#### Defined in

[packages/halo/credentials/src/greet/greeting-command-plugin.ts:28](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/greeting-command-plugin.ts#L28)

___

### InvitationOnFinish

Ƭ **InvitationOnFinish**: () => `Promise`<`void`\>

#### Type declaration

▸ (): `Promise`<`void`\>

##### Returns

`Promise`<`void`\>

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:35](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/invitation.ts#L35)

___

### PartyInvitationGreetingHandler

Ƭ **PartyInvitationGreetingHandler**: (`invitationID`: `Buffer`, `remotePeerId`: `Buffer`, `peerId`: `Buffer`) => `Promise`<`any`\>

#### Type declaration

▸ (`invitationID`, `remotePeerId`, `peerId`): `Promise`<`any`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `invitationID` | `Buffer` |
| `remotePeerId` | `Buffer` |
| `peerId` | `Buffer` |

##### Returns

`Promise`<`any`\>

#### Defined in

[packages/halo/credentials/src/greet/party-invitation-claim-handler.ts:17](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/party-invitation-claim-handler.ts#L17)

___

### PartyWriter

Ƭ **PartyWriter**: (`params`: `Message`[]) => `Promise`<`Message`[]\>

#### Type declaration

▸ (`params`): `Promise`<`Message`[]\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Message`[] |

##### Returns

`Promise`<`Message`[]\>

#### Defined in

[packages/halo/credentials/src/greet/greeter.ts:33](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/greeter.ts#L33)

___

### SecretKey

Ƭ **SecretKey**: `Buffer`

#### Defined in

[packages/halo/credentials/src/keys/keytype.ts:7](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/keys/keytype.ts#L7)

___

### SecretProvider

Ƭ **SecretProvider**: (`info?`: [`SecretInfo`](../interfaces/dxos_credentials.SecretInfo.md)) => `Promise`<`Buffer`\>

#### Type declaration

▸ (`info?`): `Promise`<`Buffer`\>

Provides a shared secret during an invitation process.

##### Parameters

| Name | Type |
| :------ | :------ |
| `info?` | [`SecretInfo`](../interfaces/dxos_credentials.SecretInfo.md) |

##### Returns

`Promise`<`Buffer`\>

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:22](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/invitation.ts#L22)

___

### SecretValidator

Ƭ **SecretValidator**: (`invitation`: [`Invitation`](../classes/dxos_credentials.Invitation.md), `secret`: `Buffer`) => `Promise`<`boolean`\>

#### Type declaration

▸ (`invitation`, `secret`): `Promise`<`boolean`\>

Validates the shared secret during an invitation process.

##### Parameters

| Name | Type |
| :------ | :------ |
| `invitation` | [`Invitation`](../classes/dxos_credentials.Invitation.md) |
| `secret` | `Buffer` |

##### Returns

`Promise`<`boolean`\>

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:27](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/invitation.ts#L27)

___

### SigningKey

Ƭ **SigningKey**: `KeyRecord` \| `KeyChain` \| `PublicKey`

#### Defined in

[packages/halo/credentials/src/keys/signer.ts:10](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/keys/signer.ts#L10)

## Variables

### ERR\_GREET\_ALREADY\_CONNECTED\_TO\_SWARM

• `Const` **ERR\_GREET\_ALREADY\_CONNECTED\_TO\_SWARM**: ``"ERR_GREET_ALREADY_CONNECTED_TO_SWARM"``

Greeter is alreary connected to supplied party.

#### Defined in

[packages/halo/credentials/src/greet/error-codes.ts:57](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/error-codes.ts#L57)

___

### ERR\_GREET\_CONNECTED\_TO\_SWARM\_TIMEOUT

• `Const` **ERR\_GREET\_CONNECTED\_TO\_SWARM\_TIMEOUT**: ``"ERR_GREET_CONNECTED_TO_SWARM_TIMEOUT"``

The connection to supplied party timed out.

#### Defined in

[packages/halo/credentials/src/greet/error-codes.ts:63](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/error-codes.ts#L63)

___

### ERR\_GREET\_GENERAL

• `Const` **ERR\_GREET\_GENERAL**: ``"ERR_GREET_GENERAL"``

Any general error condition.

#### Defined in

[packages/halo/credentials/src/greet/error-codes.ts:9](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/error-codes.ts#L9)

___

### ERR\_GREET\_INVALID\_COMMAND

• `Const` **ERR\_GREET\_INVALID\_COMMAND**: ``"ERR_GREET_INVALID_COMMAND"``

The Greeting command is unrecognized.

#### Defined in

[packages/halo/credentials/src/greet/error-codes.ts:15](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/error-codes.ts#L15)

___

### ERR\_GREET\_INVALID\_INVITATION

• `Const` **ERR\_GREET\_INVALID\_INVITATION**: ``"ERR_GREET_INVALID_INVITATION"``

The invitation does not exist or the attempted access to it was unauthorized.

#### Defined in

[packages/halo/credentials/src/greet/error-codes.ts:27](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/error-codes.ts#L27)

___

### ERR\_GREET\_INVALID\_MSG\_TYPE

• `Const` **ERR\_GREET\_INVALID\_MSG\_TYPE**: ``"ERR_GREET_INVALID_MSG_TYPE"``

The message type of a submitted message is not allowed or invalid.

#### Defined in

[packages/halo/credentials/src/greet/error-codes.ts:33](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/error-codes.ts#L33)

___

### ERR\_GREET\_INVALID\_NONCE

• `Const` **ERR\_GREET\_INVALID\_NONCE**: ``"ERR_GREET_INVALID_NONCE"``

The nonce on a submitted message does not match the expected value.

#### Defined in

[packages/halo/credentials/src/greet/error-codes.ts:39](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/error-codes.ts#L39)

___

### ERR\_GREET\_INVALID\_PARTY

• `Const` **ERR\_GREET\_INVALID\_PARTY**: ``"ERR_GREET_INVALID_PARTY"``

The supplied party is not one known or serviced by this Greeter.

#### Defined in

[packages/halo/credentials/src/greet/error-codes.ts:45](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/error-codes.ts#L45)

___

### ERR\_GREET\_INVALID\_SIGNATURE

• `Const` **ERR\_GREET\_INVALID\_SIGNATURE**: ``"ERR_GREET_INVALID_SIGNATURE"``

The signature on a submitted message cannot be verified.

#### Defined in

[packages/halo/credentials/src/greet/error-codes.ts:51](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/error-codes.ts#L51)

___

### ERR\_GREET\_INVALID\_STATE

• `Const` **ERR\_GREET\_INVALID\_STATE**: ``"ERR_GREET_INVALID_STATE"``

The Greeting command has invalid state (eg, commands were re-executed, or executed out-of-order).

#### Defined in

[packages/halo/credentials/src/greet/error-codes.ts:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/error-codes.ts#L21)

___

### IdentityEvents

• `Const` **IdentityEvents**: [`UPDATE_IDENTITY`](../enums/dxos_credentials.IdentityEventType.md#update_identity)[]

#### Defined in

[packages/halo/credentials/src/identity/events.ts:10](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/identity/events.ts#L10)

___

### PartyEvents

• `Const` **PartyEvents**: `string`[]

#### Defined in

[packages/halo/credentials/src/party/events.ts:12](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/events.ts#L12)

___

### TYPE\_URL\_MESSAGE

• `Const` **TYPE\_URL\_MESSAGE**: ``"dxos.halo.signed.Message"``

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:19](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L19)

___

### TYPE\_URL\_PARTY\_CREDENTIAL

• `Const` **TYPE\_URL\_PARTY\_CREDENTIAL**: ``"dxos.halo.credentials.party.PartyCredential"``

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L21)

___

### TYPE\_URL\_PARTY\_INVITATION

• `Const` **TYPE\_URL\_PARTY\_INVITATION**: ``"dxos.halo.credentials.party.PartyInvitation"``

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:22](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L22)

___

### TYPE\_URL\_SIGNED\_MESSAGE

• `Const` **TYPE\_URL\_SIGNED\_MESSAGE**: ``"dxos.halo.signed.SignedMessage"``

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:20](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L20)

___

### codec

• `Const` **codec**: `ProtoCodec`<`Message`\>

#### Defined in

[packages/halo/credentials/src/proto/codec.ts:7](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/proto/codec.ts#L7)

## Functions

### admitsKeys

▸ **admitsKeys**(`message`): `PublicKey`[]

Provides a list of the publicKeys admitted by this PartyCredentialMessage.

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Message` \| `SignedMessage` |

#### Returns

`PublicKey`[]

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:232](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L232)

___

### assertNoSecrets

▸ **assertNoSecrets**(`keyRecord`): `void`

Checks that the KeyRecord contains no secrets (ie, secretKey and seedPhrase).

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyRecord` | `Omit`<`KeyRecord`, ``"key"``\> |

#### Returns

`void`

#### Defined in

[packages/halo/credentials/src/keys/keyring-helpers.ts:74](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/keys/keyring-helpers.ts#L74)

___

### assertValidAttributes

▸ **assertValidAttributes**(`keyRecord`): `void`

Checks that there are no unknown attributes on the KeyRecord.

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyRecord` | `Partial`<`KeyRecord`\> |

#### Returns

`void`

#### Defined in

[packages/halo/credentials/src/keys/keyring-helpers.ts:95](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/keys/keyring-helpers.ts#L95)

___

### assertValidKeyPair

▸ **assertValidKeyPair**(`keyRecord`): asserts keyRecord is KeyPair

Checks for a valid publicKey/secretKey KeyPair.

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyRecord` | `any` |

#### Returns

asserts keyRecord is KeyPair

#### Defined in

[packages/halo/credentials/src/keys/keyring-helpers.ts:65](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/keys/keyring-helpers.ts#L65)

___

### assertValidPublicKey

▸ **assertValidPublicKey**(`key`, `keyType?`): asserts key is PublicKeyLike

Checks for a valid publicKey Buffer.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `PublicKeyLike` |
| `keyType?` | `KeyType` |

#### Returns

asserts key is PublicKeyLike

#### Defined in

[packages/halo/credentials/src/keys/keyring-helpers.ts:43](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/keys/keyring-helpers.ts#L43)

___

### assertValidSecretKey

▸ **assertValidSecretKey**(`key?`, `keyType?`): asserts key is Buffer

Checks for a valid secretKey Buffer.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key?` | `Buffer` |
| `keyType?` | `KeyType` |

#### Returns

asserts key is Buffer

#### Defined in

[packages/halo/credentials/src/keys/keyring-helpers.ts:53](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/keys/keyring-helpers.ts#L53)

___

### canonicalStringify

▸ **canonicalStringify**(`obj`): `string`

Utility method to produce stable output for signing/verifying.

#### Parameters

| Name | Type |
| :------ | :------ |
| `obj` | `any` |

#### Returns

`string`

#### Defined in

[packages/halo/credentials/src/keys/keyring-helpers.ts:138](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/keys/keyring-helpers.ts#L138)

___

### checkAndNormalizeKeyRecord

▸ **checkAndNormalizeKeyRecord**(`keyRecord`): `KeyRecord`

Checks conformity and normalizes the KeyRecord. (Used before storing, so that only well-formed records are stored.)

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyRecord` | `Omit`<`KeyRecord`, ``"key"``\> |

#### Returns

`KeyRecord`

A normalized copy of keyRecord.

#### Defined in

[packages/halo/credentials/src/keys/keyring-helpers.ts:173](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/keys/keyring-helpers.ts#L173)

___

### codecLoop

▸ **codecLoop**(`message`): `Message`

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |

#### Returns

`Message`

#### Defined in

[packages/halo/credentials/src/proto/codec.ts:10](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/proto/codec.ts#L10)

___

### createAuthMessage

▸ **createAuthMessage**(`signer`, `partyKey`, `identityKey`, `deviceKey`, `feedKey?`, `nonce?`, `feedAdmit?`): `WithTypeUrl`<`Message`\>

Create `dxos.credentials.auth.Auth` credentials.

#### Parameters

| Name | Type |
| :------ | :------ |
| `signer` | [`Signer`](../interfaces/dxos_credentials.Signer.md) |
| `partyKey` | `PublicKeyLike` |
| `identityKey` | `KeyRecord` |
| `deviceKey` | `KeyRecord` \| `KeyChain` |
| `feedKey?` | `PublicKey` |
| `nonce?` | `Buffer` |
| `feedAdmit?` | `Message` |

#### Returns

`WithTypeUrl`<`Message`\>

#### Defined in

[packages/halo/credentials/src/auth/auth-message.ts:19](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/auth/auth-message.ts#L19)

___

### createDateTimeString

▸ **createDateTimeString**(): `string`

Creates a properly formatted RFC-3339 date-time string for "now".

#### Returns

`string`

#### Defined in

[packages/halo/credentials/src/proto/datetime.ts:11](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/proto/datetime.ts#L11)

___

### createDeviceInfoMessage

▸ **createDeviceInfoMessage**(`keyring`, `displayName`, `deviceKey`): `Message`

Creates a DeviceInfo SignedMessage.

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyring` | [`Keyring`](../classes/dxos_credentials.Keyring.md) |
| `displayName` | `string` |
| `deviceKey` | `KeyRecord` |

#### Returns

`Message`

#### Defined in

[packages/halo/credentials/src/identity/identity-message.ts:24](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/identity/identity-message.ts#L24)

___

### createEnvelopeMessage

▸ **createEnvelopeMessage**(`signer`, `partyKey`, `contents`, `signingKeys?`, `nonce?`): `Message`

A signed message containing a signed message. This is used when wishing to write a message on behalf of another,
as in Greeting, or when copying a message from Party to another, such as copying an IdentityInfo message from the
HALO to a Party that is being joined.

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `signer` | [`Signer`](../interfaces/dxos_credentials.Signer.md) | `undefined` |
| `partyKey` | `PublicKeyLike` | `undefined` |
| `contents` | `Message` | `undefined` |
| `signingKeys` | (`KeyRecord` \| `KeyChain`)[] | `[]` |
| `nonce?` | `Buffer` | `undefined` |

#### Returns

`Message`

Signed message.

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:115](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L115)

___

### createFeedAdmitMessage

▸ **createFeedAdmitMessage**(`signer`, `partyKey`, `feedKey`, `signingKeys?`, `nonce?`): `Message`

Admit a single feed to the Party. This message must be signed by the feed key to be admitted, also by some other
key which has already been admitted (usually by a device identity key).

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `signer` | [`Signer`](../interfaces/dxos_credentials.Signer.md) | `undefined` |
| `partyKey` | `PublicKeyLike` | `undefined` |
| `feedKey` | `PublicKey` | `undefined` |
| `signingKeys` | (`PublicKey` \| `KeyRecord` \| `KeyChain`)[] | `[]` |
| `nonce?` | `Buffer` | `undefined` |

#### Returns

`Message`

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:87](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L87)

___

### createGreetingBeginMessage

▸ **createGreetingBeginMessage**(): `WithTypeUrl`<`Command`\>

Create a Greeting 'BEGIN' command message.

#### Returns

`WithTypeUrl`<`Command`\>

#### Defined in

[packages/halo/credentials/src/greet/greeting-message.ts:17](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/greeting-message.ts#L17)

___

### createGreetingClaimMessage

▸ **createGreetingClaimMessage**(`invitationID`): `WithTypeUrl`<`Command`\>

Create a Greeting 'CLAIM' command message.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationID` | `Buffer` |

#### Returns

`WithTypeUrl`<`Command`\>

#### Defined in

[packages/halo/credentials/src/greet/greeting-message.ts:70](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/greeting-message.ts#L70)

___

### createGreetingClaimResponse

▸ **createGreetingClaimResponse**(`id`, `rendezvousKey`): `WithTypeUrl`<`ClaimResponse`\>

Crate a Greeting ClaimResponse message.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `Buffer` | The ID of the new invitation. |
| `rendezvousKey` | `Buffer` | The swarm key to use for Greeting. |

#### Returns

`WithTypeUrl`<`ClaimResponse`\>

#### Defined in

[packages/halo/credentials/src/greet/greeting-message.ts:91](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/greeting-message.ts#L91)

___

### createGreetingFinishMessage

▸ **createGreetingFinishMessage**(`secret`): `WithTypeUrl`<`Command`\>

Create a Greeting 'FINISH' command message.

#### Parameters

| Name | Type |
| :------ | :------ |
| `secret` | `Buffer` |

#### Returns

`WithTypeUrl`<`Command`\>

#### Defined in

[packages/halo/credentials/src/greet/greeting-message.ts:56](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/greeting-message.ts#L56)

___

### createGreetingHandshakeMessage

▸ **createGreetingHandshakeMessage**(`secret`, `params?`): `WithTypeUrl`<`Command`\>

Create a Greeting 'HANDSHAKE' command message.

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `secret` | `Buffer` | `undefined` |
| `params` | `never`[] | `[]` |

#### Returns

`WithTypeUrl`<`Command`\>

#### Defined in

[packages/halo/credentials/src/greet/greeting-message.ts:26](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/greeting-message.ts#L26)

___

### createGreetingNotarizeMessage

▸ **createGreetingNotarizeMessage**(`secret`, `credentialMessages`): `WithTypeUrl`<`Command`\>

Create a Greeting 'NOTARIZE' command message.

#### Parameters

| Name | Type |
| :------ | :------ |
| `secret` | `Buffer` |
| `credentialMessages` | `WithTypeUrl`<`Message` \| `SignedMessage`\>[] |

#### Returns

`WithTypeUrl`<`Command`\>

#### Defined in

[packages/halo/credentials/src/greet/greeting-message.ts:41](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/greeting-message.ts#L41)

___

### createIdentityInfoMessage

▸ **createIdentityInfoMessage**(`keyring`, `displayName`, `identityKey`): `Message`

Creates a IdentityInfo SignedMessage.

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyring` | [`Keyring`](../classes/dxos_credentials.Keyring.md) |
| `displayName` | `string` |
| `identityKey` | `KeyRecord` |

#### Returns

`Message`

#### Defined in

[packages/halo/credentials/src/identity/identity-message.ts:41](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/identity/identity-message.ts#L41)

___

### createKeyAdmitMessage

▸ **createKeyAdmitMessage**(`signer`, `partyKey`, `admitKeyPair`, `signingKeys?`, `nonce?`): `Message`

Admit a single key to the Party.
This message must be signed by the key to be admitted, and unless the contents
of an Envelope, also by a key which has already been admitted.

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `signer` | [`Signer`](../interfaces/dxos_credentials.Signer.md) | `undefined` |
| `partyKey` | `PublicKeyLike` | `undefined` |
| `admitKeyPair` | `KeyRecord` | `undefined` |
| `signingKeys` | (`KeyRecord` \| `KeyChain`)[] | `[]` |
| `nonce?` | `Buffer` | `undefined` |

#### Returns

`Message`

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:61](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L61)

___

### createKeyRecord

▸ **createKeyRecord**(`attributes?`, `keyPair?`): `KeyRecord`

Create a new KeyRecord with the indicated attributes.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `attributes` | `Partial`<`KeyRecord`\> | Valid attributes above. |
| `keyPair` | `MakeOptional`<`KeyPair`, ``"secretKey"``\> | If undefined then a public/private key pair will be generated. |

#### Returns

`KeyRecord`

#### Defined in

[packages/halo/credentials/src/keys/keyring-helpers.ts:111](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/keys/keyring-helpers.ts#L111)

___

### createMeter

▸ **createMeter**(`metrics`): (`target`: `any`, `propertyName`: `string`, `descriptor`: `TypedPropertyDescriptor`<(...`args`: `any`) => `any`\>) => `void`

A decorator for collecting metrics on methods.

#### Parameters

| Name | Type |
| :------ | :------ |
| `metrics` | [`SimpleMetrics`](../classes/dxos_credentials.SimpleMetrics.md) |

#### Returns

`fn`

▸ (`target`, `propertyName`, `descriptor`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `target` | `any` |
| `propertyName` | `string` |
| `descriptor` | `TypedPropertyDescriptor`<(...`args`: `any`) => `any`\> |

##### Returns

`void`

#### Defined in

[packages/halo/credentials/src/keys/simple-metrics.ts:51](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/keys/simple-metrics.ts#L51)

___

### createPartyGenesisMessage

▸ **createPartyGenesisMessage**(`signer`, `partyKeyPair`, `feedKey`, `admitKeyPair`): `Message`

The start-of-authority record for the Party, admitting a single key (usually a identity) and a single feed.
It must be signed by all three keys (party, key, feed).
The Party private key should be destroyed after signing this message.

#### Parameters

| Name | Type |
| :------ | :------ |
| `signer` | [`Signer`](../interfaces/dxos_credentials.Signer.md) |
| `partyKeyPair` | `KeyRecord` |
| `feedKey` | `PublicKey` |
| `admitKeyPair` | `KeyRecord` |

#### Returns

`Message`

Signed message

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:34](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L34)

___

### createPartyInvitationMessage

▸ **createPartyInvitationMessage**(`signer`, `partyKey`, `inviteeKey`, `issuerKey`, `signingKey?`): `Object`

Create a `dxos.credentials.party.PartyInvitation` message.

#### Parameters

| Name | Type |
| :------ | :------ |
| `signer` | [`Signer`](../interfaces/dxos_credentials.Signer.md) |
| `partyKey` | `PublicKeyLike` |
| `inviteeKey` | `PublicKeyLike` |
| `issuerKey` | `KeyRecord` \| `KeyChain` |
| `signingKey?` | `KeyRecord` \| `KeyChain` |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `@type` | `string` |
| `payload` | `WithTypeUrl`<`SignedMessage`\> |

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:275](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L275)

___

### defaultSecretProvider

▸ **defaultSecretProvider**(`info?`): `Promise`<`Buffer`\>

Provides a shared secret during an invitation process.

#### Parameters

| Name | Type |
| :------ | :------ |
| `info?` | [`SecretInfo`](../interfaces/dxos_credentials.SecretInfo.md) |

#### Returns

`Promise`<`Buffer`\>

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:22](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/invitation.ts#L22)

___

### defaultSecretValidator

▸ **defaultSecretValidator**(`invitation`, `secret`): `Promise`<`boolean`\>

Validates the shared secret during an invitation process.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitation` | [`Invitation`](../classes/dxos_credentials.Invitation.md) |
| `secret` | `Buffer` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:27](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/invitation.ts#L27)

___

### extractContents

▸ **extractContents**(`message`): `any`

Extract the contents of a SignedMessage

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `SignedMessage` |

#### Returns

`any`

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:204](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L204)

___

### generatePasscode

▸ **generatePasscode**(`length?`): `string`

Generates a numeric passcode.

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `length` | `number` | `4` |

#### Returns

`string`

#### Defined in

[packages/halo/credentials/src/greet/passcode.ts:10](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/greet/passcode.ts#L10)

___

### generateSeedPhrase

▸ **generateSeedPhrase**(): `string`

Generate bip39 seed phrase (aka mnemonic).

#### Returns

`string`

#### Defined in

[packages/halo/credentials/src/identity/seedphrase.ts:15](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/identity/seedphrase.ts#L15)

___

### getPartyCredentialMessageType

▸ **getPartyCredentialMessageType**(`message`, `deep?`): `Type`

Returns the PartyCredential.Type for the message.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `message` | `Message` \| `SignedMessage` | `undefined` |  |
| `deep?` | `boolean` | `true` | Whether to return the inner type of a message if it is in an ENVELOPE. |

#### Returns

`Type`

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:218](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L218)

___

### isDeviceInfoMessage

▸ **isDeviceInfoMessage**(`message`): `boolean`

Returns true if the message is a DeviceInfo message, else false.

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Message` \| `SignedMessage` |

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/identity/identity-message.ts:73](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/identity/identity-message.ts#L73)

___

### isEnvelope

▸ `Private` **isEnvelope**(`message`): `any`

Is SignedMessage `message` an Envelope?

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |

#### Returns

`any`

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:153](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L153)

___

### isIdentityInfoMessage

▸ **isIdentityInfoMessage**(`message`): `boolean`

Returns true if the message is a IdentityInfo message, else false.

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Message` \| `SignedMessage` |

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/identity/identity-message.ts:85](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/identity/identity-message.ts#L85)

___

### isIdentityMessage

▸ **isIdentityMessage**(`message`): `any`

Returns true if the message is an Identity-related message, else false.

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Message` \| `SignedMessage` |

#### Returns

`any`

#### Defined in

[packages/halo/credentials/src/identity/identity-message.ts:60](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/identity/identity-message.ts#L60)

___

### isKeyChain

▸ **isKeyChain**(`key?`): key is KeyChain

Is object `key` a KeyChain?

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `any` |

#### Returns

key is KeyChain

#### Defined in

[packages/halo/credentials/src/keys/keyring-helpers.ts:167](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/keys/keyring-helpers.ts#L167)

___

### isPartyCredentialMessage

▸ **isPartyCredentialMessage**(`message`): `boolean`

Is `message` a PartyCredential message?

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Message` \| `SignedMessage` |

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:141](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L141)

___

### isPartyInvitationMessage

▸ **isPartyInvitationMessage**(`message`): `boolean`

Is `message` a PartyInvitation message?

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Message` \| `SignedMessage` |

#### Returns

`boolean`

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:311](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L311)

___

### isSignedMessage

▸ `Private` **isSignedMessage**(`message`): message is SignedMessage

Is this a SignedMessage?

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |

#### Returns

message is SignedMessage

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:166](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L166)

___

### isValidPublicKey

▸ **isValidPublicKey**(`key`, `keyType?`): key is PublicKeyLike

Checks for a valid publicKey Buffer.

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `PublicKeyLike` |
| `keyType?` | `KeyType` |

#### Returns

key is PublicKeyLike

#### Defined in

[packages/halo/credentials/src/keys/keyring-helpers.ts:24](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/keys/keyring-helpers.ts#L24)

___

### keyPairFromSeedPhrase

▸ **keyPairFromSeedPhrase**(`seedPhrase`): `KeyPair`

Generate key pair from seed phrase.

#### Parameters

| Name | Type |
| :------ | :------ |
| `seedPhrase` | `string` |

#### Returns

`KeyPair`

#### Defined in

[packages/halo/credentials/src/identity/seedphrase.ts:20](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/identity/seedphrase.ts#L20)

___

### keyTypeName

▸ **keyTypeName**(`keyType`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyType` | `KeyType` |

#### Returns

`string`

#### Defined in

[packages/halo/credentials/src/keys/keytype.ts:9](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/keys/keytype.ts#L9)

___

### stripSecrets

▸ **stripSecrets**(`keyRecord`): `KeyRecord`

Obscures the value of secretKey and seedPhrase with a boolean.

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyRecord` | `KeyRecord` |

#### Returns

`KeyRecord`

#### Defined in

[packages/halo/credentials/src/keys/keyring-helpers.ts:85](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/keys/keyring-helpers.ts#L85)

___

### unwrapEnvelopes

▸ **unwrapEnvelopes**(`message`): `SignedMessage`

Unwrap a SignedMessage from its Envelopes.

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |

#### Returns

`SignedMessage`

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:192](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L192)

___

### unwrapMessage

▸ **unwrapMessage**(`message`): `any`

Unwraps (if necessary) a Message to its contents.

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |

#### Returns

`any`

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:180](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L180)

___

### wrapMessage

▸ **wrapMessage**(`message`): `WithTypeUrl`<`Message`\>

Wraps a SignedMessage with a Message.

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `Message` \| `SignedMessage` \| `Command` \| `Auth` |

#### Returns

`WithTypeUrl`<`Message`\>

#### Defined in

[packages/halo/credentials/src/party/party-credential.ts:172](https://github.com/dxos/dxos/blob/32ae9b579/packages/halo/credentials/src/party/party-credential.ts#L172)
