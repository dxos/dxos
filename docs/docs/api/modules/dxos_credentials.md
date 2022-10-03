# Module: @dxos/credentials

## Enumerations

- [IdentityEventType](../enums/dxos_credentials.IdentityEventType.md)
- [PartyEventType](../enums/dxos_credentials.PartyEventType.md)

## Events

- [AuthPlugin](../classes/dxos_credentials.AuthPlugin.md)
- [GreetingCommandPlugin](../classes/dxos_credentials.GreetingCommandPlugin.md)
- [IdentityMessageProcessor](../classes/dxos_credentials.IdentityMessageProcessor.md)
- [PartyState](../classes/dxos_credentials.PartyState.md)

## Classes

- [Filter](../classes/dxos_credentials.Filter.md)
- [Greeter](../classes/dxos_credentials.Greeter.md)
- [Invitation](../classes/dxos_credentials.Invitation.md)
- [KeyStore](../classes/dxos_credentials.KeyStore.md)
- [Keyring](../classes/dxos_credentials.Keyring.md)
- [PartyAuthenticator](../classes/dxos_credentials.PartyAuthenticator.md)
- [PartyInvitationClaimHandler](../classes/dxos_credentials.PartyInvitationClaimHandler.md)
- [PartyInvitationManager](../classes/dxos_credentials.PartyInvitationManager.md)
- [SimpleMetrics](../classes/dxos_credentials.SimpleMetrics.md)

## Interfaces

- [Authenticator](../interfaces/dxos_credentials.Authenticator.md)
- [SecretInfo](../interfaces/dxos_credentials.SecretInfo.md)
- [Signer](../interfaces/dxos_credentials.Signer.md)

## Type Aliases

- [FilterFunction](../types/dxos_credentials.FilterFunction.md)
- [GreetingCommandMessageHandler](../types/dxos_credentials.GreetingCommandMessageHandler.md)
- [InvitationOnFinish](../types/dxos_credentials.InvitationOnFinish.md)
- [PartyInvitationGreetingHandler](../types/dxos_credentials.PartyInvitationGreetingHandler.md)
- [PartyWriter](../types/dxos_credentials.PartyWriter.md)
- [SecretKey](../types/dxos_credentials.SecretKey.md)
- [SecretProvider](../types/dxos_credentials.SecretProvider.md)
- [SecretValidator](../types/dxos_credentials.SecretValidator.md)
- [SigningKey](../types/dxos_credentials.SigningKey.md)

## Variables

- [ERR\_GREET\_ALREADY\_CONNECTED\_TO\_SWARM](../variables/dxos_credentials.ERR_GREET_ALREADY_CONNECTED_TO_SWARM.md)
- [ERR\_GREET\_CONNECTED\_TO\_SWARM\_TIMEOUT](../variables/dxos_credentials.ERR_GREET_CONNECTED_TO_SWARM_TIMEOUT.md)
- [ERR\_GREET\_GENERAL](../variables/dxos_credentials.ERR_GREET_GENERAL.md)
- [ERR\_GREET\_INVALID\_COMMAND](../variables/dxos_credentials.ERR_GREET_INVALID_COMMAND.md)
- [ERR\_GREET\_INVALID\_INVITATION](../variables/dxos_credentials.ERR_GREET_INVALID_INVITATION.md)
- [ERR\_GREET\_INVALID\_MSG\_TYPE](../variables/dxos_credentials.ERR_GREET_INVALID_MSG_TYPE.md)
- [ERR\_GREET\_INVALID\_NONCE](../variables/dxos_credentials.ERR_GREET_INVALID_NONCE.md)
- [ERR\_GREET\_INVALID\_PARTY](../variables/dxos_credentials.ERR_GREET_INVALID_PARTY.md)
- [ERR\_GREET\_INVALID\_SIGNATURE](../variables/dxos_credentials.ERR_GREET_INVALID_SIGNATURE.md)
- [ERR\_GREET\_INVALID\_STATE](../variables/dxos_credentials.ERR_GREET_INVALID_STATE.md)
- [IdentityEvents](../variables/dxos_credentials.IdentityEvents.md)
- [PartyEvents](../variables/dxos_credentials.PartyEvents.md)
- [TYPE\_URL\_MESSAGE](../variables/dxos_credentials.TYPE_URL_MESSAGE.md)
- [TYPE\_URL\_PARTY\_CREDENTIAL](../variables/dxos_credentials.TYPE_URL_PARTY_CREDENTIAL.md)
- [TYPE\_URL\_PARTY\_INVITATION](../variables/dxos_credentials.TYPE_URL_PARTY_INVITATION.md)
- [TYPE\_URL\_SIGNED\_MESSAGE](../variables/dxos_credentials.TYPE_URL_SIGNED_MESSAGE.md)
- [codec](../variables/dxos_credentials.codec.md)

## Functions

- [admitsKeys](../functions/dxos_credentials.admitsKeys.md)
- [assertNoSecrets](../functions/dxos_credentials.assertNoSecrets.md)
- [assertValidAttributes](../functions/dxos_credentials.assertValidAttributes.md)
- [assertValidKeyPair](../functions/dxos_credentials.assertValidKeyPair.md)
- [assertValidPublicKey](../functions/dxos_credentials.assertValidPublicKey.md)
- [assertValidSecretKey](../functions/dxos_credentials.assertValidSecretKey.md)
- [canonicalStringify](../functions/dxos_credentials.canonicalStringify.md)
- [checkAndNormalizeKeyRecord](../functions/dxos_credentials.checkAndNormalizeKeyRecord.md)
- [codecLoop](../functions/dxos_credentials.codecLoop.md)
- [createAuthMessage](../functions/dxos_credentials.createAuthMessage.md)
- [createDateTimeString](../functions/dxos_credentials.createDateTimeString.md)
- [createDeviceInfoMessage](../functions/dxos_credentials.createDeviceInfoMessage.md)
- [createEnvelopeMessage](../functions/dxos_credentials.createEnvelopeMessage.md)
- [createFeedAdmitMessage](../functions/dxos_credentials.createFeedAdmitMessage.md)
- [createGreetingBeginMessage](../functions/dxos_credentials.createGreetingBeginMessage.md)
- [createGreetingClaimMessage](../functions/dxos_credentials.createGreetingClaimMessage.md)
- [createGreetingClaimResponse](../functions/dxos_credentials.createGreetingClaimResponse.md)
- [createGreetingFinishMessage](../functions/dxos_credentials.createGreetingFinishMessage.md)
- [createGreetingHandshakeMessage](../functions/dxos_credentials.createGreetingHandshakeMessage.md)
- [createGreetingNotarizeMessage](../functions/dxos_credentials.createGreetingNotarizeMessage.md)
- [createIdentityInfoMessage](../functions/dxos_credentials.createIdentityInfoMessage.md)
- [createKeyAdmitMessage](../functions/dxos_credentials.createKeyAdmitMessage.md)
- [createKeyRecord](../functions/dxos_credentials.createKeyRecord.md)
- [createMeter](../functions/dxos_credentials.createMeter.md)
- [createPartyGenesisMessage](../functions/dxos_credentials.createPartyGenesisMessage.md)
- [createPartyInvitationMessage](../functions/dxos_credentials.createPartyInvitationMessage.md)
- [defaultSecretProvider](../functions/dxos_credentials.defaultSecretProvider.md)
- [defaultSecretValidator](../functions/dxos_credentials.defaultSecretValidator.md)
- [extractContents](../functions/dxos_credentials.extractContents.md)
- [generatePasscode](../functions/dxos_credentials.generatePasscode.md)
- [generateSeedPhrase](../functions/dxos_credentials.generateSeedPhrase.md)
- [getPartyCredentialMessageType](../functions/dxos_credentials.getPartyCredentialMessageType.md)
- [isDeviceInfoMessage](../functions/dxos_credentials.isDeviceInfoMessage.md)
- [isEnvelope](../functions/dxos_credentials.isEnvelope.md)
- [isIdentityInfoMessage](../functions/dxos_credentials.isIdentityInfoMessage.md)
- [isIdentityMessage](../functions/dxos_credentials.isIdentityMessage.md)
- [isKeyChain](../functions/dxos_credentials.isKeyChain.md)
- [isPartyCredentialMessage](../functions/dxos_credentials.isPartyCredentialMessage.md)
- [isPartyInvitationMessage](../functions/dxos_credentials.isPartyInvitationMessage.md)
- [isSignedMessage](../functions/dxos_credentials.isSignedMessage.md)
- [isValidPublicKey](../functions/dxos_credentials.isValidPublicKey.md)
- [keyPairFromSeedPhrase](../functions/dxos_credentials.keyPairFromSeedPhrase.md)
- [keyTypeName](../functions/dxos_credentials.keyTypeName.md)
- [stripSecrets](../functions/dxos_credentials.stripSecrets.md)
- [unwrapEnvelopes](../functions/dxos_credentials.unwrapEnvelopes.md)
- [unwrapMessage](../functions/dxos_credentials.unwrapMessage.md)
- [wrapMessage](../functions/dxos_credentials.wrapMessage.md)
