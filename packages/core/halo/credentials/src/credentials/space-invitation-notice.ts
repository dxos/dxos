//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { subtleCrypto } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { fromDate, fromPublicKey, toDate, toPublicKey } from '@dxos/protocols/buf';
import {
  type Credential,
  type SpaceInvitationNotice,
  SpaceInvitationNoticeSchema,
  type SpaceMember_Role,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { createDidFromIdentityKey } from '../did.ts';
import { specificCredential } from './assertions.ts';
import { type CredentialSigner } from './credential-factory.ts';
import { getCredentialProofPayload } from './signing.ts';
import { verifyCredential } from './verifier.ts';

/** Tolerated sender clock drift before a notice counts as dated in the future. */
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1_000;

export type CreateSpaceInvitationNoticeProps = {
  spaceKey: PublicKey;
  role: SpaceMember_Role;
  /** Defaults to now. */
  sentAt?: Date;
};

/**
 * Issues a notice telling `recipientIdentityKey` that the signer's identity admitted them to a space.
 */
export const createSpaceInvitationNotice = (
  signer: CredentialSigner,
  recipientIdentityKey: PublicKey,
  { spaceKey, role, sentAt = new Date() }: CreateSpaceInvitationNoticeProps,
): Promise<Credential> =>
  signer.createCredential({
    subject: recipientIdentityKey,
    assertion: create(SpaceInvitationNoticeSchema, {
      spaceKey: fromPublicKey(spaceKey),
      role,
      sentAt: fromDate(sentAt),
    }),
  });

/**
 * Age past which a recipient discards a notice, whatever delivered it, so a replayed notice is not shown again.
 */
export const SPACE_INVITATION_NOTICE_TTL_MS = 14 * 24 * 60 * 60 * 1_000;

export type VerifySpaceInvitationNoticeProps = {
  /** Identity key of the recipient doing the verification. */
  self: PublicKey;
  /** Identity DID the relay attributes the notice to (taken from the sender's authentication). */
  claimedSender: string;
  now: Date;
  ttlMs: number;
};

export type SpaceInvitationNoticeFailure =
  | 'malformed'
  | 'invalid-signature'
  | 'forged-issuer'
  | 'wrong-subject'
  | 'expired'
  | 'future';

export type VerifiedSpaceInvitationNotice = {
  /** Hex digest of the signed payload, recomputed here rather than trusted; the dedupe key. */
  id: string;
  sender: PublicKey;
  spaceKey: PublicKey;
  role: SpaceMember_Role;
  sentAt: Date;
  assertion: SpaceInvitationNotice;
};

export type SpaceInvitationNoticeVerification =
  | { kind: 'pass'; notice: VerifiedSpaceInvitationNotice }
  | { kind: 'fail'; reason: SpaceInvitationNoticeFailure; errors?: string[] };

/**
 * Verifies a notice received through the relay: the signature (and delegation chain) must hold,
 * the issuer must be the sender the relay authenticated, the subject must be this identity, and the
 * notice must be within its time-to-live.
 */
export const verifySpaceInvitationNotice = async (
  credential: Credential,
  { self, claimedSender, now, ttlMs }: VerifySpaceInvitationNoticeProps,
): Promise<SpaceInvitationNoticeVerification> => {
  const specific = specificCredential<SpaceInvitationNotice>(credential, 'dxos.halo.credentials.SpaceInvitationNotice');
  const issuer = toPublicKey(credential.issuer);
  const subject = toPublicKey(credential.subject?.id);
  const spaceKey = toPublicKey(specific?.assertion.spaceKey);
  const sentAt = toDate(specific?.assertion.sentAt);
  const claimedId = toPublicKey(credential.id);
  if (!specific || !issuer || !subject || !spaceKey || !sentAt || !claimedId) {
    return { kind: 'fail', reason: 'malformed' };
  }

  const result = await verifyCredential(credential);
  if (result.kind === 'fail') {
    return { kind: 'fail', reason: 'invalid-signature', errors: result.errors };
  }

  // The id is not signed, so it is recomputed; otherwise one signed notice could be replayed under many ids.
  const id = PublicKey.from(
    await subtleCrypto.digest('SHA-256', new Uint8Array(getCredentialProofPayload(credential))),
  );
  if (!id.equals(claimedId)) {
    return { kind: 'fail', reason: 'malformed', errors: ['Credential id does not match its payload.'] };
  }

  if ((await createDidFromIdentityKey(issuer)) !== claimedSender) {
    return { kind: 'fail', reason: 'forged-issuer' };
  }
  if (!subject.equals(self)) {
    return { kind: 'fail', reason: 'wrong-subject' };
  }
  const age = now.getTime() - sentAt.getTime();
  if (age > ttlMs) {
    return { kind: 'fail', reason: 'expired' };
  }
  if (age < -MAX_CLOCK_SKEW_MS) {
    return { kind: 'fail', reason: 'future' };
  }

  return {
    kind: 'pass',
    notice: {
      id: id.toHex(),
      sender: issuer,
      spaceKey,
      role: specific.assertion.role,
      sentAt,
      assertion: specific.assertion,
    },
  };
};
