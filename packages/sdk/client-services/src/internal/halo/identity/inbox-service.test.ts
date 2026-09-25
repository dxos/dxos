//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';
import { describe, onTestFinished, test, vi } from 'vitest';

import { Event } from '@dxos/async';
import { type Context } from '@dxos/context';
import { createCredentialSignerWithKey, createDidFromIdentityKey } from '@dxos/credentials';
import { type MessageListener, type ReconnectListener } from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { EdgeService, type InboxNotice } from '@dxos/protocols';
import { MessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type InboxService } from '@dxos/protocols/rpc';

import {
  type InboxEdgeClient,
  type InboxIdentitySource,
  type InboxPushSource,
  InboxServiceImpl,
} from './inbox-service.ts';

/**
 * In-memory stand-in for the EDGE inbox: one pending list per recipient DID, with every connected
 * device of the recipient rung on each change, as the router's push frame would.
 */
class MemoryEdgeInbox {
  readonly notices = new Map<string, InboxNotice[]>();
  readonly #devices = new Map<string, Set<MessageListener>>();
  #nextId = 0;

  put(recipientDid: string, senderDid: string, payload: string): string {
    const id = `n${++this.#nextId}`;
    const now = Date.now();
    this.#list(recipientDid).push({ id, senderDid, sentAt: now, expiresAt: now + 1_000_000, payload });
    this.#ring(recipientDid);
    return id;
  }

  /** The client an identity authenticates as, plus the socket of one of its devices. */
  connect(did: string): { edgeClient: InboxEdgeClient; pushSource: InboxPushSource } {
    const listeners = this.#devices.get(did) ?? new Set();
    this.#devices.set(did, listeners);
    const edgeClient: InboxEdgeClient = {
      sendInboxMessage: async (_ctx: Context, recipientDid: string, payload: string) => ({
        id: this.put(recipientDid, did, payload),
      }),
      listInbox: async () => ({ notices: [...this.#list(did)] }),
      ackInbox: async (_ctx: Context, ids: readonly string[]) => {
        this.notices.set(
          did,
          this.#list(did).filter((notice) => !ids.includes(notice.id)),
        );
        this.#ring(did);
      },
    };
    const pushSource: InboxPushSource = {
      onMessage: (listener: MessageListener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      onReconnected: (_listener: ReconnectListener) => () => {},
    };
    return { edgeClient, pushSource };
  }

  #list(did: string): InboxNotice[] {
    const list = this.notices.get(did) ?? [];
    this.notices.set(did, list);
    return list;
  }

  #ring(did: string): void {
    const frame = create(MessageSchema, { serviceId: EdgeService.INBOX });
    this.#devices.get(did)?.forEach((listener) => listener(frame));
  }
}

const createIdentity = async (keyring: Keyring) => {
  const identityKey = await keyring.createKey();
  const source: InboxIdentitySource = {
    stateUpdate: new Event(),
    identity: {
      identityKey,
      getIdentityCredentialSigner: () => createCredentialSignerWithKey(keyring, identityKey),
    },
  };
  return { identityKey, did: await createDidFromIdentityKey(identityKey), source };
};

const createService = (edge: MemoryEdgeInbox, identity: { did: string; source: InboxIdentitySource }) => {
  const { edgeClient, pushSource } = edge.connect(identity.did);
  return new InboxServiceImpl(identity.source, edgeClient, pushSource);
};

/** Collects every snapshot the service emits until the test ends. */
const observe = (service: InboxServiceImpl): InboxService.Notices[] => {
  const snapshots: InboxService.Notices[] = [];
  const fiber = Effect.runFork(
    service['InboxService.subscribe']().pipe(
      Stream.runForEach((snapshot) => Effect.sync(() => snapshots.push(snapshot))),
    ),
  );
  onTestFinished(() => EffectEx.runPromise(Fiber.interrupt(fiber)));
  return snapshots;
};

const latest = (snapshots: InboxService.Notices[]) => snapshots.at(-1)?.notices ?? [];

describe('InboxService', () => {
  test('delivers a signed notice to the recipient', async ({ expect }) => {
    const keyring = new Keyring();
    const edge = new MemoryEdgeInbox();
    const alice = await createIdentity(keyring);
    const bob = await createIdentity(keyring);
    const sender = createService(edge, alice);
    const snapshots = observe(createService(edge, bob));

    const spaceKey = PublicKey.random();
    await EffectEx.runPromise(
      sender['InboxService.send']({ recipientIdentityKey: bob.identityKey, spaceKey, role: SpaceMember_Role.EDITOR }),
    );

    await vi.waitFor(() => expect(latest(snapshots)).toHaveLength(1));
    const [notice] = latest(snapshots);
    expect(notice.senderIdentityKey.equals(alice.identityKey)).toBe(true);
    expect(notice.spaceKey.equals(spaceKey)).toBe(true);
    expect(notice.role).toBe(SpaceMember_Role.EDITOR);
  });

  test('dedupes by credential id and acks every copy', async ({ expect }) => {
    const keyring = new Keyring();
    const edge = new MemoryEdgeInbox();
    const alice = await createIdentity(keyring);
    const bob = await createIdentity(keyring);
    const recipient = createService(edge, bob);
    const snapshots = observe(recipient);

    await EffectEx.runPromise(
      createService(edge, alice)['InboxService.send']({
        recipientIdentityKey: bob.identityKey,
        spaceKey: PublicKey.random(),
        role: SpaceMember_Role.EDITOR,
      }),
    );
    const [first] = edge.notices.get(bob.did) ?? [];
    edge.put(bob.did, alice.did, first.payload);

    await vi.waitFor(() => expect(edge.notices.get(bob.did)).toHaveLength(2));
    await vi.waitFor(() => expect(latest(snapshots)).toHaveLength(1));

    await EffectEx.runPromise(recipient['InboxService.ack']({ ids: [latest(snapshots)[0].id] }));
    expect(edge.notices.get(bob.did)).toHaveLength(0);
    await vi.waitFor(() => expect(latest(snapshots)).toHaveLength(0));
  });

  test('drops a notice whose issuer is not the authenticated sender', async ({ expect }) => {
    const keyring = new Keyring();
    const edge = new MemoryEdgeInbox();
    const alice = await createIdentity(keyring);
    const bob = await createIdentity(keyring);
    const mallory = await createIdentity(keyring);

    // Mallory relays a notice Alice signed, so EDGE attributes it to Mallory.
    const credential = await createForeignNotice(alice, bob.identityKey);
    edge.put(bob.did, mallory.did, credential);

    const snapshots = observe(createService(edge, bob));
    await vi.waitFor(() => expect(snapshots.length).toBeGreaterThan(0));
    expect(latest(snapshots)).toHaveLength(0);
    await vi.waitFor(() => expect(edge.notices.get(bob.did)).toHaveLength(0));
  });

  test('an ack on one device clears the notice on the others', async ({ expect }) => {
    const keyring = new Keyring();
    const edge = new MemoryEdgeInbox();
    const alice = await createIdentity(keyring);
    const bob = await createIdentity(keyring);
    const laptop = createService(edge, bob);
    const phone = createService(edge, bob);
    const laptopSnapshots = observe(laptop);
    const phoneSnapshots = observe(phone);

    await EffectEx.runPromise(
      createService(edge, alice)['InboxService.send']({
        recipientIdentityKey: bob.identityKey,
        spaceKey: PublicKey.random(),
        role: SpaceMember_Role.EDITOR,
      }),
    );
    await vi.waitFor(() => expect(latest(phoneSnapshots)).toHaveLength(1));
    await vi.waitFor(() => expect(latest(laptopSnapshots)).toHaveLength(1));

    await EffectEx.runPromise(laptop['InboxService.ack']({ ids: [latest(laptopSnapshots)[0].id] }));
    await vi.waitFor(() => expect(latest(phoneSnapshots)).toHaveLength(0));
  });

  test('without EDGE it reports an empty inbox and refuses to send', async ({ expect }) => {
    const keyring = new Keyring();
    const alice = await createIdentity(keyring);
    const service = new InboxServiceImpl(alice.source);
    const snapshots = observe(service);
    await vi.waitFor(() => expect(snapshots).toHaveLength(1));
    expect(latest(snapshots)).toHaveLength(0);

    const exit = await EffectEx.runPromise(
      Effect.exit(
        service['InboxService.send']({
          recipientIdentityKey: PublicKey.random(),
          spaceKey: PublicKey.random(),
          role: SpaceMember_Role.EDITOR,
        }),
      ),
    );
    expect(exit._tag).toBe('Failure');
  });
});

/** The payload of a notice `issuer` sent to `recipient`, as it travels through EDGE. */
const createForeignNotice = async (
  issuer: { identityKey: PublicKey; source: InboxIdentitySource },
  recipient: PublicKey,
): Promise<string> => {
  const edge = new MemoryEdgeInbox();
  const recipientDid = await createDidFromIdentityKey(recipient);
  await EffectEx.runPromise(
    createService(edge, { did: await createDidFromIdentityKey(issuer.identityKey), source: issuer.source })[
      'InboxService.send'
    ]({ recipientIdentityKey: recipient, spaceKey: PublicKey.random(), role: SpaceMember_Role.ADMIN }),
  );
  const [notice] = edge.notices.get(recipientDid) ?? [];
  return notice.payload;
};
