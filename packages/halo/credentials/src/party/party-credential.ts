//
// Copyright 2019 DXOS.org
//

import assert from 'node:assert';

import { WithTypeUrl } from '@dxos/codec-protobuf';
import { randomBytes } from '@dxos/crypto';
import { PublicKey, PublicKeyLike } from '@dxos/protocols';
import { Auth } from '@dxos/protocols/proto/dxos/halo/credentials/auth';
import { Command } from '@dxos/protocols/proto/dxos/halo/credentials/greet';
import { PartyCredential } from '@dxos/protocols/proto/dxos/halo/credentials/party';
import { KeyChain, KeyRecord } from '@dxos/protocols/proto/dxos/halo/keys';
import { Message, SignedMessage } from '@dxos/protocols/proto/dxos/halo/signed';

import { assertValidPublicKey, Signer } from '../keys';

// TODO(burdon): Remove dependencies on ANY?
export const TYPE_URL_MESSAGE = 'dxos.halo.signed.Message';
export const TYPE_URL_SIGNED_MESSAGE = 'dxos.halo.signed.SignedMessage';
export const TYPE_URL_PARTY_CREDENTIAL = 'dxos.halo.credentials.party.PartyCredential';
export const TYPE_URL_PARTY_INVITATION = 'dxos.halo.credentials.party.PartyInvitation';

/**
 * The start-of-authority record for the Party, admitting a single key (usually a identity) and a single feed.
 * It must be signed by all three keys (party, key, feed). The Party private key should be destroyed after
 * signing this message.
 * @param signer
 * @param partyKeyPair
 * @param feedKey
 * @param admitKeyPair
 * @returns Signed message
 */
export const createPartyGenesisMessage = (
  signer: Signer,
  partyKeyPair: KeyRecord,
  feedKey: PublicKey,
  admitKeyPair: KeyRecord
): Message => {
  assert(typeof admitKeyPair.type !== 'undefined');

  const message: WithTypeUrl<PartyCredential> = {
    '@type': TYPE_URL_PARTY_CREDENTIAL,
    type: PartyCredential.Type.PARTY_GENESIS,
    partyGenesis: {
      partyKey: partyKeyPair.publicKey
      // TODO(burdon): Credentials clash.
      // feedKey,
      // admitKey: admitKeyPair.publicKey,
      // admitKeyType: admitKeyPair.type
    }
  };

  return wrapMessage(signer.sign(message, [partyKeyPair, feedKey, admitKeyPair]));
};

/**
 * Admit a single key to the Party.
 * This message must be signed by the key to be admitted, and unless the contents
 * of an Envelope, also by a key which has already been admitted.
 */
export const createKeyAdmitMessage = (
  signer: Signer,
  partyKey: PublicKeyLike,
  admitKeyPair: KeyRecord,
  signingKeys: (KeyRecord | KeyChain)[] = [],
  nonce?: Buffer): Message => {
  assert(typeof admitKeyPair.type !== 'undefined');
  partyKey = PublicKey.from(partyKey);

  const message: WithTypeUrl<PartyCredential> = {
    '@type': TYPE_URL_PARTY_CREDENTIAL,
    type: PartyCredential.Type.KEY_ADMIT,
    keyAdmit: {
      partyKey,
      admitKey: admitKeyPair.publicKey,
      admitKeyType: admitKeyPair.type
    }
  };

  return wrapMessage(signer.sign(message, [admitKeyPair, ...signingKeys], nonce));
};

/**
 * Admit a single feed to the Party. This message must be signed by the feed key to be admitted, also by some other
 * key which has already been admitted (usually by a device identity key).
 */
export const createFeedAdmitMessage = (
  signer: Signer,
  partyKey: PublicKeyLike,
  feedKey: PublicKey,
  signingKeys: (KeyRecord | KeyChain | PublicKey)[] = [],
  nonce?: Buffer
): Message => {
  partyKey = PublicKey.from(partyKey);

  const message: WithTypeUrl<PartyCredential> = {
    '@type': TYPE_URL_PARTY_CREDENTIAL,
    type: PartyCredential.Type.FEED_ADMIT,
    feedAdmit: {
      partyKey,
      feedKey
    }
  };

  return wrapMessage(signer.sign(message, [feedKey, ...signingKeys], nonce));
};

/**
 * A signed message containing a signed message. This is used when wishing to write a message on behalf of another,
 * as in Greeting, or when copying a message from Party to another, such as copying an IdentityInfo message from the
 * HALO to a Party that is being joined.
 * @returns Signed message.
 */
// TODO(burdon): What is an envelope, distinct from above?
export const createEnvelopeMessage = (
  signer: Signer,
  partyKey: PublicKeyLike,
  contents: Message,
  signingKeys: (KeyRecord | KeyChain)[] = [],
  nonce?: Buffer
): Message => {
  partyKey = PublicKey.from(partyKey);

  const message: WithTypeUrl<PartyCredential> = {
    '@type': TYPE_URL_PARTY_CREDENTIAL,
    type: PartyCredential.Type.ENVELOPE,
    envelope: {
      partyKey,
      message: contents
    }
  };

  return wrapMessage(signer.sign(message, [...signingKeys], nonce));
};

/**
 * Is `message` a PartyCredential message?
 * @param {Message} message
 * @return {boolean}
 */
export const isPartyCredentialMessage = (message: Message | SignedMessage) => {
  const signed = unwrapMessage(message) as SignedMessage;
  // eslint-disable-next-line camelcase
  return signed?.signed?.payload?.['@type'] === TYPE_URL_PARTY_CREDENTIAL;
};

/**
 * Is SignedMessage `message` an Envelope?
 * @param {SignedMessage} message
 * @return {boolean}
 * @private
 */
export const isEnvelope = (message: any) => {
  assert(message);
  const type = message?.signed?.payload?.type;
  const envelope = message?.signed?.payload?.envelope;
  return type === PartyCredential.Type.ENVELOPE && envelope;
};

/**
 * Is this a SignedMessage?
 * @param {Object} message
 * @return {boolean}
 * @private
 */
export const isSignedMessage = (message: any): message is SignedMessage => message && message.signed && message.signed.payload && message.signatures && Array.isArray(message.signatures);

/**
 * Wraps a SignedMessage with a Message.
 */
// TODO(burdon): Typespec is too loose.
export const wrapMessage = (message: Message | SignedMessage | Command | Auth): WithTypeUrl<Message> => {
  const payload = message as any;
  return { '@type': TYPE_URL_MESSAGE, payload } as WithTypeUrl<Message>;
};

/**
 * Unwraps (if necessary) a Message to its contents.
 */
export const unwrapMessage = (message: any): any => {
  let result: any = message;
  while (result.payload) { // TODO(burdon): Recursion!
    result = result.payload;
  }

  return result;
};

/**
 * Unwrap a SignedMessage from its Envelopes.
 */
export const unwrapEnvelopes = (message: any): SignedMessage => {
  // Unwrap any Envelopes.
  while (isEnvelope(message)) {
    message = message.signed.payload.envelope.message.payload;
  }

  return message;
};

/**
 * Extract the contents of a SignedMessage
 */
export const extractContents = (message: SignedMessage): any => {
  // Unwrap any payload.
  let contents: any = message;
  while (contents.signed || contents.payload) {
    contents = contents.signed || contents.payload;
  }
  return contents;
};

/**
 * Returns the PartyCredential.Type for the message.
 * @param {SignedMessage} message
 * @param {boolean} [deep=true] Whether to return the inner type of a message if it is in an ENVELOPE.
 */
export const getPartyCredentialMessageType = (message: Message | SignedMessage, deep = true): PartyCredential.Type => {
  assert(isPartyCredentialMessage(message));

  const signed = unwrapMessage(message);
  const type = signed?.signed?.payload?.type;
  if (deep && type === PartyCredential.Type.ENVELOPE) {
    return getPartyCredentialMessageType(signed.signed.payload.envelope.message.payload);
  }
  return type;
};

/**
 * Provides a list of the publicKeys admitted by this PartyCredentialMessage.
 */
export const admitsKeys = (message: Message | SignedMessage): PublicKey[] => {
  assert(message);
  assert(isPartyCredentialMessage(message));

  const keys = [];

  const unwrapped = unwrapEnvelopes(unwrapMessage(message));

  const type = getPartyCredentialMessageType(unwrapped, false);
  switch (type) {
    case PartyCredential.Type.PARTY_GENESIS: {
      const { admitKey, feedKey, partyKey } = unwrapped.signed.payload.partyGenesis;
      keys.push(partyKey);
      keys.push(admitKey);
      keys.push(feedKey);
      break;
    }
    case PartyCredential.Type.KEY_ADMIT: {
      const { admitKey } = unwrapped.signed.payload.keyAdmit;
      keys.push(admitKey);
      break;
    }
    case PartyCredential.Type.FEED_ADMIT: {
      const { feedKey } = unwrapped.signed.payload.feedAdmit;
      keys.push(feedKey);
      break;
    }
    default:
      throw new Error(`Invalid type: ${type}`);
  }

  return keys.map(PublicKey.from);
};

/**
 * Create a `dxos.credentials.party.PartyInvitation` message.
 * @param {Signer} signer
 * @param {PublicKeyLike} partyKey
 * @param {PublicKeyLike} inviteeKey
 * @param {KeyRecord|KeyChain} issuerKey
 * @param {KeyRecord|KeyChain} [signingKey]
 * @returns {Message}
 */
export const createPartyInvitationMessage = (
  signer: Signer,
  partyKey: PublicKeyLike,
  inviteeKey: PublicKeyLike,
  issuerKey: KeyRecord | KeyChain,
  signingKey?: KeyRecord | KeyChain
) => {
  assert(signer);
  assertValidPublicKey(issuerKey.publicKey);
  if (!signingKey) {
    signingKey = issuerKey;
  }
  assert(signingKey);
  assertValidPublicKey(signingKey.publicKey);

  partyKey = PublicKey.from(partyKey);
  inviteeKey = PublicKey.from(inviteeKey);

  return {
    '@type': TYPE_URL_MESSAGE,
    payload:
      signer.sign({
        '@type': TYPE_URL_PARTY_INVITATION,
        id: randomBytes(),
        partyKey,
        issuerKey: issuerKey.publicKey,
        inviteeKey
      }, [signingKey])
  };
};

/**
 * Is `message` a PartyInvitation message?
 * @param {Message} message
 * @return {boolean}
 */
export const isPartyInvitationMessage = (message: Message | SignedMessage) => {
  const signed = unwrapMessage(message);

  // eslint-disable-next-line camelcase
  const payloadType = signed?.['@type'];
  // eslint-disable-next-line camelcase
  const signedType = signed?.signed?.payload?.['@type'];
  return payloadType === TYPE_URL_SIGNED_MESSAGE && signedType === TYPE_URL_PARTY_INVITATION;
};
