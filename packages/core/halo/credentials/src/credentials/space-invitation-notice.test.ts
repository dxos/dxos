//
// Copyright 2026 DXOS.org
//

import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { describe, test } from 'vitest';

import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { fromPublicKey, toPublicKey } from '@dxos/protocols/buf';
import {
  AuthorizedDeviceSchema,
  ChainSchema,
  CredentialSchema,
  SpaceMember_Role,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { createDidFromIdentityKey } from '../did.ts';
import {
  createCredential,
  createCredentialSignerWithChain,
  createCredentialSignerWithKey,
} from './credential-factory.ts';
import { proofOf } from './credential-keys.ts';
import { createSpaceInvitationNotice, verifySpaceInvitationNotice } from './space-invitation-notice.ts';

const TTL_MS = 14 * 24 * 60 * 60 * 1_000;

const setup = async () => {
  const keyring = new Keyring();
  const sender = await keyring.createKey();
  const device = await keyring.createKey();
  const recipient = PublicKey.random();
  const chain = create(ChainSchema, {
    credential: await createCredential({
      assertion: create(AuthorizedDeviceSchema, {
        identityKey: fromPublicKey(sender),
        deviceKey: fromPublicKey(device),
      }),
      subject: device,
      issuer: sender,
      signer: keyring,
    }),
  });
  const signer = createCredentialSignerWithChain(keyring, chain, device);
  return { keyring, sender, senderDid: await createDidFromIdentityKey(sender), recipient, signer };
};

describe('space invitation notice', () => {
  test('pass - delegated device signs for the identity', async ({ expect }) => {
    const { sender, senderDid, recipient, signer } = await setup();
    const spaceKey = PublicKey.random();
    const credential = await createSpaceInvitationNotice(signer, recipient, {
      spaceKey,
      role: SpaceMember_Role.EDITOR,
    });

    // Round-trip through the wire encoding the relay carries.
    const received = fromBinary(CredentialSchema, toBinary(CredentialSchema, credential));
    const result = await verifySpaceInvitationNotice(received, {
      self: recipient,
      claimedSender: senderDid,
      now: new Date(),
      ttlMs: TTL_MS,
    });
    expect(result.kind).toBe('pass');
    if (result.kind === 'pass') {
      expect(result.notice.sender.equals(sender)).toBe(true);
      expect(result.notice.spaceKey.equals(spaceKey)).toBe(true);
      expect(result.notice.role).toBe(SpaceMember_Role.EDITOR);
      expect(result.notice.id).toBe(toPublicKey(received.id)?.toHex());
    }
  });

  test('fail - forged issuer', async ({ expect }) => {
    const { recipient, signer } = await setup();
    const credential = await createSpaceInvitationNotice(signer, recipient, {
      spaceKey: PublicKey.random(),
      role: SpaceMember_Role.EDITOR,
    });
    const result = await verifySpaceInvitationNotice(credential, {
      self: recipient,
      claimedSender: await createDidFromIdentityKey(PublicKey.random()),
      now: new Date(),
      ttlMs: TTL_MS,
    });
    expect(result).toMatchObject({ kind: 'fail', reason: 'forged-issuer' });
  });

  test('fail - issuer not backed by the signer', async ({ expect }) => {
    const { keyring, senderDid, recipient } = await setup();
    // An attacker's own key claiming to be the sender without a chain from the sender's identity.
    const attacker = await keyring.createKey();
    const credential = await createSpaceInvitationNotice(createCredentialSignerWithKey(keyring, attacker), recipient, {
      spaceKey: PublicKey.random(),
      role: SpaceMember_Role.EDITOR,
    });
    const result = await verifySpaceInvitationNotice(credential, {
      self: recipient,
      claimedSender: senderDid,
      now: new Date(),
      ttlMs: TTL_MS,
    });
    expect(result).toMatchObject({ kind: 'fail', reason: 'forged-issuer' });
  });

  test('fail - wrong subject', async ({ expect }) => {
    const { senderDid, recipient, signer } = await setup();
    const credential = await createSpaceInvitationNotice(signer, recipient, {
      spaceKey: PublicKey.random(),
      role: SpaceMember_Role.EDITOR,
    });
    const result = await verifySpaceInvitationNotice(credential, {
      self: PublicKey.random(),
      claimedSender: senderDid,
      now: new Date(),
      ttlMs: TTL_MS,
    });
    expect(result).toMatchObject({ kind: 'fail', reason: 'wrong-subject' });
  });

  test('fail - expired', async ({ expect }) => {
    const { senderDid, recipient, signer } = await setup();
    const sentAt = new Date(Date.now() - TTL_MS - 1_000);
    const credential = await createSpaceInvitationNotice(signer, recipient, {
      spaceKey: PublicKey.random(),
      role: SpaceMember_Role.EDITOR,
      sentAt,
    });
    const result = await verifySpaceInvitationNotice(credential, {
      self: recipient,
      claimedSender: senderDid,
      now: new Date(),
      ttlMs: TTL_MS,
    });
    expect(result).toMatchObject({ kind: 'fail', reason: 'expired' });
  });

  test('fail - bad signature', async ({ expect }) => {
    const { senderDid, recipient, signer } = await setup();
    const credential = await createSpaceInvitationNotice(signer, recipient, {
      spaceKey: PublicKey.random(),
      role: SpaceMember_Role.EDITOR,
    });
    proofOf(credential).value[0]++;
    const result = await verifySpaceInvitationNotice(credential, {
      self: recipient,
      claimedSender: senderDid,
      now: new Date(),
      ttlMs: TTL_MS,
    });
    expect(result).toMatchObject({ kind: 'fail', reason: 'invalid-signature' });
  });

  test('duplicate - same notice verifies to the same id; a tampered id is rejected', async ({ expect }) => {
    const { senderDid, recipient, signer } = await setup();
    const credential = await createSpaceInvitationNotice(signer, recipient, {
      spaceKey: PublicKey.random(),
      role: SpaceMember_Role.EDITOR,
    });
    const props = { self: recipient, claimedSender: senderDid, now: new Date(), ttlMs: TTL_MS };
    const first = await verifySpaceInvitationNotice(
      fromBinary(CredentialSchema, toBinary(CredentialSchema, credential)),
      props,
    );
    const second = await verifySpaceInvitationNotice(
      fromBinary(CredentialSchema, toBinary(CredentialSchema, credential)),
      props,
    );
    expect(first.kind === 'pass' && second.kind === 'pass' && first.notice.id === second.notice.id).toBe(true);

    const replayed = fromBinary(CredentialSchema, toBinary(CredentialSchema, credential));
    replayed.id = fromPublicKey(PublicKey.random());
    expect(await verifySpaceInvitationNotice(replayed, props)).toMatchObject({ kind: 'fail', reason: 'malformed' });
  });

  test('fail - not a notice', async ({ expect }) => {
    const { keyring, senderDid, recipient } = await setup();
    const identity = await keyring.createKey();
    const credential = await createCredential({
      assertion: create(AuthorizedDeviceSchema, {
        identityKey: fromPublicKey(identity),
        deviceKey: fromPublicKey(recipient),
      }),
      subject: recipient,
      issuer: identity,
      signer: keyring,
    });
    const result = await verifySpaceInvitationNotice(credential, {
      self: recipient,
      claimedSender: senderDid,
      now: new Date(),
      ttlMs: TTL_MS,
    });
    expect(result).toMatchObject({ kind: 'fail', reason: 'malformed' });
  });
});
