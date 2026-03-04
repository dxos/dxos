//
// Copyright 2022 DXOS.org
//

import { type Codec } from '@dxos/protocols';
import { credentialToBinary, unpackAssertion } from '@dxos/credentials';
import { createCodecEncoding } from '@dxos/hypercore';
import { PublicKey } from '@dxos/keys';
import { TimeframeVectorProto, type bufWkt, create, fromBinary, toBinary } from '@dxos/protocols/buf';
import { type FeedMessage, FeedMessageSchema } from '@dxos/protocols/buf/dxos/echo/feed_pb';
import { CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { Timeframe } from '@dxos/timeframe';

/**
 * Find the credential in a FeedMessage, handling both:
 * - Buf oneof format: msg.payload.payload.case === 'credential'
 * - Flat init format: msg.payload.credential.credential (before create() processes it)
 */
const findCredentialInFeedMessage = (
  msg: any,
): { credential: any; path: 'oneof' | 'flat-payload' | 'flat-root' } | null => {
  if (msg.payload?.payload?.case === 'credential') {
    return { credential: msg.payload.payload.value?.credential, path: 'oneof' };
  }
  if (msg.payload?.credential?.credential) {
    return { credential: msg.payload.credential.credential, path: 'flat-payload' };
  }
  if (msg.credential?.credential) {
    return { credential: msg.credential.credential, path: 'flat-root' };
  }
  return null;
};

/**
 * Unpack a packed Any assertion within a credential to a typed buf message.
 * After deserialization, assertions are proper Any (typeUrl + value).
 * Unpacking restores the CredentialAssertion for direct field access.
 */
const unpackCredentialAssertion = (msg: FeedMessage): void => {
  const credential = (msg.payload as any)?.credential?.credential;
  if (!credential?.subject?.assertion) {
    return;
  }
  const assertion = credential.subject.assertion as bufWkt.Any;
  if (assertion.typeUrl && assertion.value) {
    const unpacked = unpackAssertion(assertion);
    if (unpacked) {
      credential.subject.assertion = unpacked;
    }
  }
};

/**
 * Convert buf PublicKey messages to @dxos/keys.PublicKey in credential fields.
 * This is needed because application code expects @dxos/keys.PublicKey instances
 * (which have methods like asUint8Array, toHex, equals).
 */
const convertCredentialPublicKeys = (msg: FeedMessage): void => {
  const credential = (msg.payload as any)?.credential?.credential;
  if (!credential) {
    return;
  }
  if (credential.issuer?.data instanceof Uint8Array) {
    credential.issuer = PublicKey.from(credential.issuer.data);
  }
  if (credential.subject?.id?.data instanceof Uint8Array) {
    credential.subject.id = PublicKey.from(credential.subject.id.data);
  }
  if (credential.id?.data instanceof Uint8Array) {
    credential.id = PublicKey.from(credential.id.data);
  }
  if (credential.proof?.signer?.data instanceof Uint8Array) {
    credential.proof.signer = PublicKey.from(credential.proof.signer.data);
  }
  if (credential.parentCredentialIds) {
    credential.parentCredentialIds = credential.parentCredentialIds.map((pk: any) =>
      pk?.data instanceof Uint8Array ? PublicKey.from(pk.data) : pk,
    );
  }
  // Recurse into chain.
  if (credential.proof?.chain?.credential) {
    const chainCred = credential.proof.chain.credential;
    if (chainCred.issuer?.data instanceof Uint8Array) {
      chainCred.issuer = PublicKey.from(chainCred.issuer.data);
    }
    if (chainCred.subject?.id?.data instanceof Uint8Array) {
      chainCred.subject.id = PublicKey.from(chainCred.subject.id.data);
    }
    if (chainCred.proof?.signer?.data instanceof Uint8Array) {
      chainCred.proof.signer = PublicKey.from(chainCred.proof.signer.data);
    }
  }
};

/**
 * Convert @dxos/keys.PublicKey instances in credential fields to { data: Uint8Array }
 * so that create() + toBinary() can process them as buf PublicKey messages.
 * Only targets known PublicKey fields on credentials to avoid breaking other message structures.
 */
const convertCredentialPublicKeysForBuf = (msg: FeedMessage): void => {
  const found = findCredentialInFeedMessage(msg);
  if (!found?.credential) {
    return;
  }
  const cred = found.credential;
  const convertPk = (pk: unknown) => (PublicKey.isPublicKey(pk) ? { data: (pk as PublicKey).asUint8Array() } : pk);

  if (PublicKey.isPublicKey(cred.issuer)) {
    cred.issuer = convertPk(cred.issuer);
  }
  if (cred.subject?.id && PublicKey.isPublicKey(cred.subject.id)) {
    cred.subject.id = convertPk(cred.subject.id);
  }
  if (cred.id && PublicKey.isPublicKey(cred.id)) {
    cred.id = convertPk(cred.id);
  }
  if (cred.proof?.signer && PublicKey.isPublicKey(cred.proof.signer)) {
    cred.proof.signer = convertPk(cred.proof.signer);
  }
  if (cred.parentCredentialIds) {
    cred.parentCredentialIds = cred.parentCredentialIds.map(convertPk);
  }
  // Recurse into chain credential.
  if (cred.proof?.chain?.credential) {
    const chain = cred.proof.chain.credential;
    if (PublicKey.isPublicKey(chain.issuer)) {
      chain.issuer = convertPk(chain.issuer);
    }
    if (chain.subject?.id && PublicKey.isPublicKey(chain.subject.id)) {
      chain.subject.id = convertPk(chain.subject.id);
    }
    if (chain.id && PublicKey.isPublicKey(chain.id)) {
      chain.id = convertPk(chain.id);
    }
    if (chain.proof?.signer && PublicKey.isPublicKey(chain.proof.signer)) {
      chain.proof.signer = convertPk(chain.proof.signer);
    }
    if (chain.parentCredentialIds) {
      chain.parentCredentialIds = chain.parentCredentialIds.map(convertPk);
    }
  }
};

export const codec: Codec<FeedMessage> = {
  encode: (msg: FeedMessage) => {
    // Serialize the credential separately using credentialToBinary which handles
    // assertion packing and PublicKey conversion. Then embed the binary credential
    // in a well-formed FeedMessage for final serialization.
    const found = findCredentialInFeedMessage(msg);
    if (found?.credential) {
      // Round-trip the credential through its own binary format.
      const credBinary = credentialToBinary(found.credential);
      const credNormalized = fromBinary(CredentialSchema, credBinary);
      if (found.path === 'oneof') {
        (msg.payload!.payload as any).value.credential = credNormalized;
      } else if (found.path === 'flat-payload') {
        (msg as any).payload.credential.credential = credNormalized;
      } else {
        (msg as any).credential.credential = credNormalized;
      }
    }

    // Convert Timeframe class instances to buf TimeframeVector.
    if (msg.timeframe && msg.timeframe instanceof Timeframe) {
      (msg as any).timeframe = TimeframeVectorProto.encode(msg.timeframe as any);
    }

    const created = create(FeedMessageSchema, msg);
    return toBinary(FeedMessageSchema, created);
  },
  decode: (bytes: Uint8Array) => {
    const msg = fromBinary(FeedMessageSchema, bytes);
    if (msg.timeframe) {
      (msg as any).timeframe = TimeframeVectorProto.decode(msg.timeframe);
    }
    // Flatten oneof for backward compatibility with proto-typed FeedMessageBlock consumers.
    if (msg.payload?.payload?.case === 'credential') {
      (msg.payload as any).credential = msg.payload.payload.value;
    } else if (msg.payload?.payload?.case === 'data') {
      (msg.payload as any).data = msg.payload.payload.value;
    }
    // Unpack Any assertion back to TypedMessage for signature verification.
    unpackCredentialAssertion(msg);
    // Convert buf PublicKey messages to @dxos/keys.PublicKey for application code.
    convertCredentialPublicKeys(msg);
    return msg;
  },
};

/**
 * Value encoding used by feed store.
 */
export const valueEncoding = createCodecEncoding(codec);
