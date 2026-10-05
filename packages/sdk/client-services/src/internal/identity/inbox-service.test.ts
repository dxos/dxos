//
// Copyright 2026 DXOS.org
//

import { toBinary } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import { describe, onTestFinished, test, vi } from 'vitest';

import { Event } from '@dxos/async';
import {
  createCredentialSignerWithKey,
  createDidFromIdentityKey,
  createInboxEnvelope,
  createSpaceInvitationNotice,
  encodeInboxEnvelope,
} from '@dxos/credentials';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { INBOX_MAX_PAYLOAD_LENGTH, InboxAccountRequiredError, InboxPayloadTooLargeError } from '@dxos/protocols';
import { CredentialSchema, SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { InboxService } from '@dxos/protocols/rpc';
import { Message, SpaceInvitationMessage } from '@dxos/types';

import { MemoryEdgeInbox } from '../testing/index.ts';
import { type InboxIdentitySource, InboxServiceImpl } from './inbox-service.ts';

const createIdentity = async (keyring: Keyring) => {
  const identityKey = await keyring.createKey();
  const source: InboxIdentitySource = {
    stateUpdate: new Event(),
    identity: {
      identityKey,
      getInboxEnvelopeSigner: () => ({ identityKey, signingKey: identityKey, signer: keyring }),
    },
  };
  return { keyring, identityKey, did: await createDidFromIdentityKey(identityKey), source };
};

type TestIdentity = Awaited<ReturnType<typeof createIdentity>>;

const createService = (edge: MemoryEdgeInbox, identity: TestIdentity) => {
  const { edgeClient, pushSource } = edge.connect(identity.source);
  return new InboxServiceImpl(identity.source, edgeClient, pushSource);
};

/** Collects every snapshot the service emits until the test ends. */
const observe = (service: InboxServiceImpl): InboxService.Messages[] => {
  const snapshots: InboxService.Messages[] = [];
  const fiber = Effect.runFork(
    service['InboxService.subscribe']().pipe(
      Stream.runForEach((snapshot) => Effect.sync(() => snapshots.push(snapshot))),
    ),
  );
  onTestFinished(() => EffectEx.runPromise(Fiber.interrupt(fiber)));
  return snapshots;
};

const latest = (snapshots: InboxService.Messages[]) => snapshots.at(-1)?.messages ?? [];

const send = (sender: InboxServiceImpl, recipientIdentityKey: PublicKey, payload = '{}') =>
  EffectEx.runPromise(
    sender['InboxService.sendMessage']({ recipientIdentityKey, type: InboxService.INBOX_MESSAGE_TYPE, payload }),
  );

/** The base64 payload of an envelope `issuer` signed for `recipient`, as it travels through EDGE. */
const envelopePayload = async (
  issuer: TestIdentity,
  recipient: PublicKey,
  { type = InboxService.INBOX_MESSAGE_TYPE, version }: { type?: string; version?: number } = {},
) => {
  const envelope = await createInboxEnvelope(
    { identityKey: issuer.identityKey, signingKey: issuer.identityKey, signer: issuer.keyring },
    recipient,
    { type, payload: '{}' },
  );
  if (version !== undefined) {
    envelope.version = version;
  }
  return Buffer.from(encodeInboxEnvelope(envelope)).toString('base64');
};

describe('InboxService', () => {
  test('delivers a signed message to the recipient', async ({ expect }) => {
    const keyring = new Keyring();
    const edge = new MemoryEdgeInbox();
    const alice = await createIdentity(keyring);
    const bob = await createIdentity(keyring);
    const snapshots = observe(createService(edge, bob));

    await send(createService(edge, alice), bob.identityKey, '{"text":"hello"}');

    await vi.waitFor(() => expect(latest(snapshots)).toHaveLength(1));
    const [message] = latest(snapshots);
    expect(message.senderIdentityKey.equals(alice.identityKey)).toBe(true);
    expect(message.type).toBe(InboxService.INBOX_MESSAGE_TYPE);
    expect(message.payload).toBe('{"text":"hello"}');
  });

  test('dedupes by envelope id and acks every copy', async ({ expect }) => {
    const keyring = new Keyring();
    const edge = new MemoryEdgeInbox();
    const alice = await createIdentity(keyring);
    const bob = await createIdentity(keyring);
    const recipient = createService(edge, bob);
    const snapshots = observe(recipient);

    await send(createService(edge, alice), bob.identityKey);
    const [first] = edge.notices.get(bob.did) ?? [];
    edge.put(bob.did, alice.did, first.payload);

    await vi.waitFor(() => expect(edge.notices.get(bob.did)).toHaveLength(2));
    await vi.waitFor(() => expect(latest(snapshots)).toHaveLength(1));

    await EffectEx.runPromise(recipient['InboxService.ack']({ ids: [latest(snapshots)[0].id] }));
    expect(edge.notices.get(bob.did)).toHaveLength(0);
    await vi.waitFor(() => expect(latest(snapshots)).toHaveLength(0));
  });

  test('acks an envelope that fails verification', async ({ expect }) => {
    const keyring = new Keyring();
    const edge = new MemoryEdgeInbox();
    const alice = await createIdentity(keyring);
    const bob = await createIdentity(keyring);
    const mallory = await createIdentity(keyring);

    // Mallory relays an envelope Alice signed, so EDGE attributes it to Mallory.
    edge.put(bob.did, mallory.did, await envelopePayload(alice, bob.identityKey));

    const snapshots = observe(createService(edge, bob));
    await vi.waitFor(() => expect(snapshots.length).toBeGreaterThan(0));
    expect(latest(snapshots)).toHaveLength(0);
    await vi.waitFor(() => expect(edge.notices.get(bob.did)).toHaveLength(0));
  });

  test('leaves an unknown type or version pending, not acked', async ({ expect }) => {
    const keyring = new Keyring();
    const edge = new MemoryEdgeInbox();
    const alice = await createIdentity(keyring);
    const bob = await createIdentity(keyring);
    edge.put(bob.did, alice.did, await envelopePayload(alice, bob.identityKey, { type: 'org.example.future' }));
    edge.put(bob.did, alice.did, await envelopePayload(alice, bob.identityKey, { version: 2 }));
    // A known message after them, so the test knows the pull has finished.
    edge.put(bob.did, alice.did, await envelopePayload(alice, bob.identityKey));

    const snapshots = observe(createService(edge, bob));
    await vi.waitFor(() => expect(latest(snapshots)).toHaveLength(1));
    expect(edge.notices.get(bob.did)).toHaveLength(3);
  });

  test('surfaces a legacy invitation credential as an invitation message', async ({ expect }) => {
    const keyring = new Keyring();
    const edge = new MemoryEdgeInbox();
    const alice = await createIdentity(keyring);
    const bob = await createIdentity(keyring);
    const spaceKey = PublicKey.random();
    const credential = await createSpaceInvitationNotice(
      createCredentialSignerWithKey(keyring, alice.identityKey),
      bob.identityKey,
      { spaceKey, role: SpaceMember_Role.EDITOR },
    );
    edge.put(bob.did, alice.did, Buffer.from(toBinary(CredentialSchema, credential)).toString('base64'));

    const snapshots = observe(createService(edge, bob));
    await vi.waitFor(() => expect(latest(snapshots)).toHaveLength(1));
    const [message] = latest(snapshots);
    expect(message.senderIdentityKey.equals(alice.identityKey)).toBe(true);
    expect(message.type).toBe(InboxService.INBOX_MESSAGE_TYPE);
    const data = Option.getOrThrow(Message.decodeJson(message.payload));
    expect(data.sender.identityDid).toBe(alice.did);
    expect(Option.getOrThrow(SpaceInvitationMessage.match(data))).toMatchObject({
      spaceKey: spaceKey.toHex(),
      role: SpaceMember_Role.EDITOR,
    });
  });

  test('acks a payload that is neither an envelope nor a credential', async ({ expect }) => {
    const keyring = new Keyring();
    const edge = new MemoryEdgeInbox();
    const alice = await createIdentity(keyring);
    const bob = await createIdentity(keyring);
    edge.put(bob.did, alice.did, Buffer.from('not a message').toString('base64'));

    observe(createService(edge, bob));
    await vi.waitFor(() => expect(edge.notices.get(bob.did)).toHaveLength(0));
  });

  test('an ack on one device clears the message on the others', async ({ expect }) => {
    const keyring = new Keyring();
    const edge = new MemoryEdgeInbox();
    const alice = await createIdentity(keyring);
    const bob = await createIdentity(keyring);
    const laptop = createService(edge, bob);
    const phone = createService(edge, bob);
    const laptopSnapshots = observe(laptop);
    const phoneSnapshots = observe(phone);

    await send(createService(edge, alice), bob.identityKey);
    await vi.waitFor(() => expect(latest(phoneSnapshots)).toHaveLength(1));
    await vi.waitFor(() => expect(latest(laptopSnapshots)).toHaveLength(1));

    await EffectEx.runPromise(laptop['InboxService.ack']({ ids: [latest(laptopSnapshots)[0].id] }));
    await vi.waitFor(() => expect(latest(phoneSnapshots)).toHaveLength(0));
  });

  test('refuses a message too large for EDGE before sending it', async ({ expect }) => {
    const keyring = new Keyring();
    const edge = new MemoryEdgeInbox();
    const alice = await createIdentity(keyring);
    const bob = await createIdentity(keyring);

    const error = await EffectEx.runPromise(
      Effect.flip(
        createService(edge, alice)['InboxService.sendMessage']({
          recipientIdentityKey: bob.identityKey,
          type: InboxService.INBOX_MESSAGE_TYPE,
          payload: 'x'.repeat(INBOX_MAX_PAYLOAD_LENGTH),
        }),
      ),
    );
    expect(InboxPayloadTooLargeError.is(error)).toBe(true);
    expect(edge.notices.get(bob.did) ?? []).toHaveLength(0);
  });

  test('a sender without an account is refused with a typed error', async ({ expect }) => {
    const keyring = new Keyring();
    const edge = new MemoryEdgeInbox();
    const alice = await createIdentity(keyring);
    const bob = await createIdentity(keyring);
    edge.accountless.add(alice.did);

    const error = await EffectEx.runPromise(
      Effect.flip(
        createService(edge, alice)['InboxService.sendMessage']({
          recipientIdentityKey: bob.identityKey,
          type: InboxService.INBOX_MESSAGE_TYPE,
          payload: '{}',
        }),
      ),
    );
    expect(InboxAccountRequiredError.is(error)).toBe(true);
    expect(edge.notices.get(bob.did) ?? []).toHaveLength(0);
  });

  test('a recipient without an account sees the status once, and again once linked', async ({ expect }) => {
    const keyring = new Keyring();
    const edge = new MemoryEdgeInbox();
    const bob = await createIdentity(keyring);
    edge.accountless.add(bob.did);
    const snapshots = observe(createService(edge, bob));
    const refused = () => snapshots.filter((snapshot) => snapshot.status === 'account-required');

    await vi.waitFor(() => expect(refused()).toHaveLength(1));
    for (let i = 0; i < 3; i++) {
      bob.source.stateUpdate.emit();
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(refused()).toHaveLength(1);

    edge.accountless.delete(bob.did);
    bob.source.stateUpdate.emit();
    await vi.waitFor(() => expect(snapshots.at(-1)?.status).toBe('available'));
  });

  test('without EDGE it reports an empty inbox and refuses to send', async ({ expect }) => {
    const keyring = new Keyring();
    const alice = await createIdentity(keyring);
    const service = new InboxServiceImpl(alice.source);
    const snapshots = observe(service);
    await vi.waitFor(() => expect(snapshots).toHaveLength(1));
    expect(latest(snapshots)).toHaveLength(0);

    await expect(send(service, PublicKey.random())).rejects.toThrow();
  });
});
