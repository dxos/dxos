//
// Copyright 2022 DXOS.org
//

import { type Codec } from '@dxos/codec-protobuf';
import { packTypedAssertionAsAny, unpackAnyAsTypedMessage } from '@dxos/credentials';
import { createCodecEncoding } from '@dxos/hypercore';
import { type bufWkt, bufToTimeframe, create, toBinary, fromBinary } from '@dxos/protocols/buf';
import { type FeedMessage, FeedMessageSchema } from '@dxos/protocols/buf/dxos/echo/feed_pb';

/**
 * Find the credential in a FeedMessage, handling both:
 * - Buf oneof format: msg.payload.payload.case === 'credential'
 * - Flat init format: msg.payload.credential.credential (before create() processes it)
 */
const findCredentialInFeedMessage = (msg: any): { credential: any; path: 'oneof' | 'flat-payload' | 'flat-root' } | null => {
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
 * Pack TypedMessage assertions into proper buf Any before create() + toBinary().
 * Returns a shallow copy with the assertion replaced; does not mutate the original.
 * Handles both oneof and flat init formats.
 */
const packFeedMessageAssertions = (msg: FeedMessage): FeedMessage => {
  const found = findCredentialInFeedMessage(msg);
  if (!found?.credential?.subject?.assertion) {
    return msg;
  }

  const { credential, path } = found;
  const assertion = credential.subject.assertion as Record<string, unknown>;
  if ((!assertion['@type'] && !assertion.$typeName) || 'typeUrl' in assertion) {
    return msg;
  }

  const packedAssertion = packTypedAssertionAsAny(assertion);
  const packedCredential = {
    ...credential,
    subject: {
      ...credential.subject,
      assertion: packedAssertion,
    },
  };

  if (path === 'oneof') {
    return {
      ...msg,
      payload: {
        ...msg.payload!,
        payload: {
          case: 'credential' as const,
          value: {
            ...(msg.payload!.payload as { case: 'credential'; value: any }).value,
            credential: packedCredential,
          },
        },
      },
    } as FeedMessage;
  } else if (path === 'flat-payload') {
    return {
      ...msg,
      payload: {
        ...(msg as any).payload,
        credential: {
          credential: packedCredential,
        },
      },
    } as FeedMessage;
  } else {
    return {
      ...msg,
      credential: {
        credential: packedCredential,
      },
    } as FeedMessage;
  }
};

/**
 * Unpack a packed Any assertion within a credential back to TypedMessage format.
 * This preserves the in-memory format used for credential signing so signature verification succeeds.
 */
const unpackCredentialAssertion = (msg: FeedMessage): void => {
  const credential = (msg.payload as any)?.credential?.credential;
  if (!credential?.subject?.assertion) {
    return;
  }
  const assertion = credential.subject.assertion as bufWkt.Any;
  if (assertion.typeUrl && assertion.value) {
    const typedMessage = unpackAnyAsTypedMessage(assertion);
    if (typedMessage) {
      credential.subject.assertion = typedMessage;
    }
  }
};

export const codec: Codec<FeedMessage> = {
  encode: (msg: FeedMessage) => {
    const prepared = packFeedMessageAssertions(msg);
    const created = create(FeedMessageSchema, prepared);
    return toBinary(FeedMessageSchema, created);
  },
  decode: (bytes: Uint8Array) => {
    const msg = fromBinary(FeedMessageSchema, bytes);
    if (msg.timeframe) {
      (msg as any).timeframe = bufToTimeframe(msg.timeframe);
    }
    // Flatten oneof for backward compatibility with proto-typed FeedMessageBlock consumers.
    if (msg.payload?.payload?.case === 'credential') {
      (msg.payload as any).credential = msg.payload.payload.value;
    } else if (msg.payload?.payload?.case === 'data') {
      (msg.payload as any).data = msg.payload.payload.value;
    }
    // Unpack Any assertion back to TypedMessage for signature verification.
    unpackCredentialAssertion(msg);
    return msg;
  },
};

/**
 * Value encoding used by feed store.
 */
export const valueEncoding = createCodecEncoding(codec);
