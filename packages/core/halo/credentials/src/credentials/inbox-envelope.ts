//
// Copyright 2026 DXOS.org
//

import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { type Signer, subtleCrypto, verifySignature } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { fromDate, fromPublicKey, toDate, toPublicKey } from '@dxos/protocols/buf';
import { type Chain } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import {
  type InboxEnvelope,
  type InboxEnvelopeHeader,
  InboxEnvelopeHeaderSchema,
  InboxEnvelopeSchema,
} from '@dxos/protocols/buf/dxos/halo/inbox_pb';

import { createDidFromIdentityKey } from '../did.ts';
import { verifyChain } from './verifier.ts';

/** The envelope format this code creates and verifies; others are left for a newer client. */
export const INBOX_ENVELOPE_VERSION = 1;

/** Tolerated sender clock drift before an envelope counts as dated in the future. */
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1_000;

/**
 * Age past which a recipient discards an envelope, whatever delivered it, so a replayed one is not shown again.
 */
export const INBOX_ENVELOPE_TTL_MS = 14 * 24 * 60 * 60 * 1_000;

/**
 * Signs envelopes as an identity. Devices do not hold the identity private key, so a device signs
 * with its own key and attaches the `AuthorizedDevice` chain that delegates the identity to it.
 */
export type InboxEnvelopeSigner = {
  /** Identity the envelope is sent as. */
  identityKey: PublicKey;
  /** The identity key itself, or a device key that `chain` delegates the identity to. */
  signingKey: PublicKey;
  chain?: Chain;
  signer: Signer;
};

export type CreateInboxEnvelopeProps = {
  /** Reverse-DNS payload type (e.g., `org.dxos.inbox.message`). */
  type: string;
  payload: string;
  /** Defaults to now. */
  sentAt?: Date;
};

/**
 * Signs `payload` for `recipient`.
 * The header is signed as its own serialized bytes and carried as those bytes, so the recipient
 * verifies exactly what was signed and no canonical re-encoding is needed.
 */
export const createInboxEnvelope = async (
  { identityKey, signingKey, chain, signer }: InboxEnvelopeSigner,
  recipient: PublicKey,
  { type, payload, sentAt = new Date() }: CreateInboxEnvelopeProps,
): Promise<InboxEnvelope> => {
  const header = toBinary(
    InboxEnvelopeHeaderSchema,
    create(InboxEnvelopeHeaderSchema, {
      version: INBOX_ENVELOPE_VERSION,
      type,
      sender: fromPublicKey(identityKey),
      recipient: fromPublicKey(recipient),
      sentAt: fromDate(sentAt),
      payload,
    }),
  );

  return create(InboxEnvelopeSchema, {
    version: INBOX_ENVELOPE_VERSION,
    header,
    signer: fromPublicKey(signingKey),
    signature: await signer.sign(signingKey, header),
    chain: signingKey.equals(identityKey) ? undefined : chain,
  });
};

/** Wire encoding of an envelope. */
export const encodeInboxEnvelope = (envelope: InboxEnvelope): Uint8Array => toBinary(InboxEnvelopeSchema, envelope);

/**
 * Decodes an envelope, or returns `undefined` when the bytes are not one.
 * A legacy credential payload decodes with no fields set (the field numbers are disjoint), so a
 * zero version marks "not an envelope" rather than a malformed one.
 */
export const decodeInboxEnvelope = (bytes: Uint8Array): InboxEnvelope | undefined => {
  try {
    const envelope = fromBinary(InboxEnvelopeSchema, bytes);
    return envelope.version > 0 ? envelope : undefined;
  } catch {
    return undefined;
  }
};

export type VerifyInboxEnvelopeProps = {
  /** Identity key of the recipient doing the verification. */
  self: PublicKey;
  /** Identity DID the relay attributes the envelope to (taken from the sender's authentication). */
  claimedSender: string;
  now: Date;
  ttlMs: number;
};

export type InboxEnvelopeFailure =
  | 'malformed'
  | 'invalid-signature'
  | 'forged-issuer'
  | 'wrong-subject'
  | 'expired'
  | 'future';

export type VerifiedInboxEnvelope = {
  /** Hex digest of the signed header bytes, recomputed by the recipient; the dedupe key. */
  id: string;
  type: string;
  sender: PublicKey;
  recipient: PublicKey;
  sentAt: Date;
  payload: string;
};

export type InboxEnvelopeVerification =
  | { kind: 'pass'; envelope: VerifiedInboxEnvelope }
  | { kind: 'fail'; reason: InboxEnvelopeFailure; errors?: string[] };

/**
 * Verifies an envelope of the current version received through the relay: the signature (and
 * device chain) must hold, the sender must be the identity the relay authenticated, the recipient
 * must be this identity, and the envelope must be within its time-to-live.
 * Callers check {@link InboxEnvelope.version} first; any other version fails as malformed.
 */
export const verifyInboxEnvelope = async (
  envelope: InboxEnvelope,
  { self, claimedSender, now, ttlMs }: VerifyInboxEnvelopeProps,
): Promise<InboxEnvelopeVerification> => {
  const header = decodeHeader(envelope.header);
  const signer = toPublicKey(envelope.signer);
  const sender = toPublicKey(header?.sender);
  const recipient = toPublicKey(header?.recipient);
  const sentAt = toDate(header?.sentAt);
  if (
    !header ||
    !signer ||
    !sender ||
    !recipient ||
    !sentAt ||
    !header.type ||
    envelope.signature.length === 0 ||
    envelope.version !== INBOX_ENVELOPE_VERSION ||
    header.version !== envelope.version
  ) {
    return { kind: 'fail', reason: 'malformed' };
  }

  if (!signer.equals(sender)) {
    if (!envelope.chain) {
      return { kind: 'fail', reason: 'invalid-signature', errors: ['Delegated envelope is missing its chain.'] };
    }
    const result = await verifyChain(envelope.chain, sender, signer);
    if (result.kind === 'fail') {
      return { kind: 'fail', reason: 'invalid-signature', errors: result.errors };
    }
  }
  if (!(await verifySignature(signer, envelope.header, envelope.signature))) {
    return { kind: 'fail', reason: 'invalid-signature', errors: ['Invalid signature.'] };
  }

  if ((await createDidFromIdentityKey(sender)) !== claimedSender) {
    return { kind: 'fail', reason: 'forged-issuer' };
  }
  if (!recipient.equals(self)) {
    return { kind: 'fail', reason: 'wrong-subject' };
  }
  const age = now.getTime() - sentAt.getTime();
  if (age > ttlMs) {
    return { kind: 'fail', reason: 'expired' };
  }
  if (age < -MAX_CLOCK_SKEW_MS) {
    return { kind: 'fail', reason: 'future' };
  }

  const id = PublicKey.from(await subtleCrypto.digest('SHA-256', new Uint8Array(envelope.header)));
  return {
    kind: 'pass',
    envelope: { id: id.toHex(), type: header.type, sender, recipient, sentAt, payload: header.payload },
  };
};

const decodeHeader = (bytes: Uint8Array): InboxEnvelopeHeader | undefined => {
  try {
    return fromBinary(InboxEnvelopeHeaderSchema, bytes);
  } catch {
    return undefined;
  }
};
