//
// Copyright 2026 DXOS.org
//

import { create, toBinary } from '@bufbuild/protobuf';
import { describe, test } from 'vitest';

import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { AuthorizedDeviceSchema, ChainSchema, CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { createDidFromIdentityKey } from '../did.ts';
import { createCredential } from './credential-factory.ts';
import {
  INBOX_ENVELOPE_TTL_MS,
  type InboxEnvelopeSigner,
  createInboxEnvelope,
  decodeInboxEnvelope,
  encodeInboxEnvelope,
  verifyInboxEnvelope,
} from './inbox-envelope.ts';

const TYPE = 'org.dxos.inbox.message';

/** A sender whose device signs for its identity, as a HALO device does. */
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
  const signer: InboxEnvelopeSigner = { identityKey: sender, signingKey: device, chain, signer: keyring };
  const props = {
    self: recipient,
    claimedSender: await createDidFromIdentityKey(sender),
    now: new Date(),
    ttlMs: INBOX_ENVELOPE_TTL_MS,
  };
  return { keyring, sender, device, recipient, chain, signer, props };
};

/** Round-trips through the wire encoding the relay carries. */
const wire = (envelope: Parameters<typeof encodeInboxEnvelope>[0]) => {
  const decoded = decodeInboxEnvelope(encodeInboxEnvelope(envelope));
  if (!decoded) {
    throw new Error('Envelope did not decode.');
  }
  return decoded;
};

describe('inbox envelope', () => {
  test('pass - round trip, signed by a delegated device', async ({ expect }) => {
    const { sender, recipient, signer, props } = await setup();
    const envelope = await createInboxEnvelope(signer, recipient, { type: TYPE, payload: '{"text":"hi"}' });
    const result = await verifyInboxEnvelope(wire(envelope), props);
    expect(result.kind).toBe('pass');
    if (result.kind === 'pass') {
      expect(result.envelope.sender.equals(sender)).toBe(true);
      expect(result.envelope.recipient.equals(recipient)).toBe(true);
      expect(result.envelope.type).toBe(TYPE);
      expect(result.envelope.payload).toBe('{"text":"hi"}');
      expect(result.envelope.id).toMatch(/^[0-9a-f]{64}$/);
    }

    // The id is a function of the signed bytes, so the same envelope dedupes however often it arrives.
    const again = await verifyInboxEnvelope(wire(envelope), props);
    expect(again.kind === 'pass' && result.kind === 'pass' && again.envelope.id === result.envelope.id).toBe(true);
  });

  test('pass - signed by the identity key itself', async ({ expect }) => {
    const { keyring, sender, recipient, props } = await setup();
    const envelope = await createInboxEnvelope(
      { identityKey: sender, signingKey: sender, signer: keyring },
      recipient,
      {
        type: TYPE,
        payload: 'x',
      },
    );
    expect(envelope.chain).toBeUndefined();
    expect((await verifyInboxEnvelope(wire(envelope), props)).kind).toBe('pass');
  });

  test('fail - tampered payload', async ({ expect }) => {
    const { recipient, signer, props } = await setup();
    const envelope = await createInboxEnvelope(signer, recipient, { type: TYPE, payload: 'original' });
    envelope.header[envelope.header.length - 1]++;
    expect(await verifyInboxEnvelope(wire(envelope), props)).toMatchObject({
      kind: 'fail',
      reason: 'invalid-signature',
    });
  });

  test('fail - wrong recipient', async ({ expect }) => {
    const { recipient, signer, props } = await setup();
    const envelope = await createInboxEnvelope(signer, recipient, { type: TYPE, payload: 'x' });
    expect(await verifyInboxEnvelope(wire(envelope), { ...props, self: PublicKey.random() })).toMatchObject({
      kind: 'fail',
      reason: 'wrong-subject',
    });
  });

  test('fail - device key not in the chain', async ({ expect }) => {
    const { keyring, sender, recipient, chain, props } = await setup();
    // A key the sender never authorized presents the sender's chain for another device.
    const stranger = await keyring.createKey();
    const envelope = await createInboxEnvelope(
      { identityKey: sender, signingKey: stranger, chain, signer: keyring },
      recipient,
      { type: TYPE, payload: 'x' },
    );
    expect(await verifyInboxEnvelope(wire(envelope), props)).toMatchObject({
      kind: 'fail',
      reason: 'invalid-signature',
    });
  });

  test('fail - forged issuer', async ({ expect }) => {
    const { recipient, signer, props } = await setup();
    const envelope = await createInboxEnvelope(signer, recipient, { type: TYPE, payload: 'x' });
    // The relay authenticated someone else, who is replaying the sender's envelope.
    const claimedSender = await createDidFromIdentityKey(PublicKey.random());
    expect(await verifyInboxEnvelope(wire(envelope), { ...props, claimedSender })).toMatchObject({
      kind: 'fail',
      reason: 'forged-issuer',
    });
  });

  test('fail - expired', async ({ expect }) => {
    const { recipient, signer, props } = await setup();
    const sentAt = new Date(Date.now() - INBOX_ENVELOPE_TTL_MS - 1_000);
    const envelope = await createInboxEnvelope(signer, recipient, { type: TYPE, payload: 'x', sentAt });
    expect(await verifyInboxEnvelope(wire(envelope), props)).toMatchObject({ kind: 'fail', reason: 'expired' });
  });

  test('fail - future-dated', async ({ expect }) => {
    const { recipient, signer, props } = await setup();
    const sentAt = new Date(Date.now() + 60 * 60 * 1_000);
    const envelope = await createInboxEnvelope(signer, recipient, { type: TYPE, payload: 'x', sentAt });
    expect(await verifyInboxEnvelope(wire(envelope), props)).toMatchObject({ kind: 'fail', reason: 'future' });
  });

  test('a legacy credential payload is not an envelope', async ({ expect }) => {
    const { keyring, sender, device } = await setup();
    const credential = await createCredential({
      assertion: create(AuthorizedDeviceSchema, {
        identityKey: fromPublicKey(sender),
        deviceKey: fromPublicKey(device),
      }),
      subject: device,
      issuer: sender,
      signer: keyring,
    });
    expect(decodeInboxEnvelope(toBinary(CredentialSchema, credential))).toBeUndefined();
  });
});
