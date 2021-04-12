//
// Copyright 2019 DXOS.org
//

import assert from 'assert';

import { randomBytes, PublicKey, PublicKeyLike } from '@dxos/crypto';

import { Keyring } from '../keys';
import { assertValidPublicKey } from '../keys/keyring-helpers';
import { KeyChain, KeyRecord, Message, SignedMessage, PartyCredential, Command, Auth } from '../proto';
import { WithTypeUrl } from '../proto/any';

export const TYPE_URL_MESSAGE = 'dxos.credentials.Message';
export const TYPE_URL_SIGNED_MESSAGE = 'dxos.credentials.SignedMessage';
export const TYPE_URL_PARTY_CREDENTIAL = 'dxos.credentials.party.PartyCredential';
export const TYPE_URL_PARTY_INVITATION = 'dxos.credentials.party.PartyInvitation';

/**
 * The start-of-authority record for the Party, admitting a single key (usually a identity) and a single feed.
 * It must be signed by all three keys (party, key, feed). The Party private key should be destroyed after
 * signing this message.
 * @param {Keyring} keyring
 * @param {KeyRecord} partyKeyPair
 * @param {KeyRecord} feedKeyPair
 * @param {KeyRecord} admitKeyPair
 * @returns {SignedMessage}
 */
export const createPartyGenesisMessage = (keyring: Keyring,
  partyKeyPair: KeyRecord,
  feedKeyPair: KeyRecord,
  admitKeyPair: KeyRecord): Message => {
  assert(keyring.hasSecretKey(admitKeyPair));
  assert(typeof admitKeyPair.type !== 'undefined');

  const message: WithTypeUrl<PartyCredential> = {
    __type_url: TYPE_URL_PARTY_CREDENTIAL,
    type: PartyCredential.Type.PARTY_GENESIS,
    partyGenesis: {
      partyKey: partyKeyPair.publicKey,
      feedKey: feedKeyPair.publicKey,
      admitKey: admitKeyPair.publicKey,
      admitKeyType: admitKeyPair.type
    }
  };

  return wrapMessage(keyring.sign(message, [partyKeyPair, feedKeyPair, admitKeyPair]));
};

/**
 * Admit a single key to the Party. This message must be signed by the key to be admitted, and unless the contents
 * of an Envelope, also by a key which has already been admitted.
 */
export const createKeyAdmitMessage = (keyring: Keyring,
  partyKey: PublicKeyLike,
  admitKeyPair: KeyRecord,
  signingKeys: (KeyRecord | KeyChain)[] = [],
  nonce?: Buffer): Message => {
  assert(keyring.hasSecretKey(admitKeyPair));
  assert(typeof admitKeyPair.type !== 'undefined');
  partyKey = PublicKey.from(partyKey);

  const message: WithTypeUrl<PartyCredential> = {
    __type_url: TYPE_URL_PARTY_CREDENTIAL,
    type: PartyCredential.Type.KEY_ADMIT,
    keyAdmit: {
      partyKey,
      admitKey: admitKeyPair.publicKey,
      admitKeyType: admitKeyPair.type
    }
  };

  return wrapMessage(keyring.sign(message, [admitKeyPair, ...signingKeys], nonce));
};

/**
 * Admit a single feed to the Party. This message must be signed by the feed key to be admitted, also by some other
 * key which has already been admitted (usually by a device identity key).
 */
export const createFeedAdmitMessage = (keyring: Keyring,
  partyKey: PublicKeyLike,
  feedKeyPair: KeyRecord,
  signingKeys: (KeyRecord | KeyChain)[] = [],
  nonce?: Buffer): Message => {
  partyKey = PublicKey.from(partyKey);

  const message: WithTypeUrl<PartyCredential> = {
    __type_url: TYPE_URL_PARTY_CREDENTIAL,
    type: PartyCredential.Type.FEED_ADMIT,
    feedAdmit: {
      partyKey,
      feedKey: feedKeyPair.publicKey
    }
  };

  return wrapMessage(keyring.sign(message, [feedKeyPair, ...signingKeys], nonce));
};

/**
 * A signed message containing a signed message. This is used when wishing to write a message on behalf of another,
 * as in Greeting, or when copying a message from Party to another, such as copying an IdentityInfo message from the
 * HALO to a Party that is being joined.
 * @returns {SignedMessage}
 */
// TODO(burdon): What is an envelope, distinct from above?
export const createEnvelopeMessage = (keyring: Keyring,
  partyKey: PublicKeyLike,
  contents: Message,
  signingKeys: (KeyRecord | KeyChain)[] = [],
  nonce?: Buffer): Message => {
  partyKey = PublicKey.from(partyKey);

  const message: WithTypeUrl<PartyCredential> = {
    __type_url: TYPE_URL_PARTY_CREDENTIAL,
    type: PartyCredential.Type.ENVELOPE,
    envelope: {
      partyKey,
      message: contents
    }
  };

  return wrapMessage(keyring.sign(message, [...signingKeys], nonce));
};

/**
 * Is `message` a PartyCredential message?
 * @param {Message} message
 * @return {boolean}
 */
export const isPartyCredentialMessage = (message: Message | SignedMessage) => {
  const signed = unwrapMessage(message) as SignedMessage;
  // eslint-disable-next-line camelcase
  return signed?.signed?.payload?.__type_url === TYPE_URL_PARTY_CREDENTIAL;
};

/**
 * Is SignedMessage `message` an Envelope?
 * @param {SignedMessage} message
 * @return {boolean}
 * @private
 */
export function isEnvelope (message: any) {
  assert(message);
  const type = message?.signed?.payload?.type;
  const envelope = message?.signed?.payload?.envelope;
  return type === PartyCredential.Type.ENVELOPE && envelope;
}

/**
 * Is this a SignedMessage?
 * @param {Object} message
 * @return {boolean}
 * @private
 */
export function isSignedMessage (message: any): message is SignedMessage {
  return message && message.signed && message.signed.payload && message.signatures && Array.isArray(message.signatures);
}

/**
 * Unwraps (if necessary) a Message to its contents.
 */
export function unwrapMessage (message: any): any {
  let result: any = message;
  while (result.payload) {
    result = result.payload;
  }
  return result;
}

/**
 * Wraps a SignedMessage with a Message
 */
export function wrapMessage (message: Message | SignedMessage | Command | Auth): WithTypeUrl<Message> {
  const payload = message as any;
  return { __type_url: TYPE_URL_MESSAGE, payload } as WithTypeUrl<Message>;
}

/**
 * Unwrap a SignedMessage from its Envelopes.
 */
export const unwrapEnvelopes = (message: any): SignedMessage => {
  // Unwrap any Envelopes
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
      throw Error(`Invalid type: ${type}`);
  }

  return keys.map(PublicKey.from);
};

/**
 * Create a `dxos.credentials.party.PartyInvitation` message.
 * @param {Keyring} keyring
 * @param {PublicKeyLike} partyKey
 * @param {PublicKeyLike} inviteeKey
 * @param {KeyRecord|KeyChain} issuerKey
 * @param {KeyRecord|KeyChain} [signingKey]
 * @returns {Message}
 */
export const createPartyInvitationMessage = (keyring: Keyring,
  partyKey: PublicKeyLike,
  inviteeKey: PublicKeyLike,
  issuerKey: KeyRecord | KeyChain,
  signingKey?: KeyRecord | KeyChain) => {
  assert(keyring);
  assertValidPublicKey(issuerKey.publicKey);
  if (!signingKey) {
    signingKey = issuerKey;
  }
  assert(signingKey);
  assertValidPublicKey(signingKey.publicKey);
  assert(keyring.hasSecretKey(signingKey));

  partyKey = PublicKey.from(partyKey);
  inviteeKey = PublicKey.from(inviteeKey);

  return {
    __type_url: TYPE_URL_MESSAGE,
    payload:
      keyring.sign({
        __type_url: TYPE_URL_PARTY_INVITATION,
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
  const payloadType = signed?.__type_url;
  // eslint-disable-next-line camelcase
  const signedType = signed?.signed?.payload?.__type_url;
  return payloadType === TYPE_URL_SIGNED_MESSAGE &&
    signedType === TYPE_URL_PARTY_INVITATION;
};
