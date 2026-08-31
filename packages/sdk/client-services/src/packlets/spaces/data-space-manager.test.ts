//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Trigger, asyncTimeout, latch, waitForCondition } from '@dxos/async';
import { Context } from '@dxos/context';
import {
  type CredentialsDocument,
  SpaceStateMachine,
  createAdmissionCredentials,
  getCredentialAssertion,
} from '@dxos/credentials';
import { type DatabaseDirectory, type SpaceRoot, createIdFromSpaceKey, isSpaceRoot } from '@dxos/echo-protocol';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { writeMessages } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { SpaceMember, type SpaceMember as SpaceMemberAssertion } from '@dxos/protocols/proto/dxos/halo/credentials';
import { openAndClose } from '@dxos/test-utils';

import { AuthStatus } from '../space';
import { TestBuilder, type TestPeer } from '../testing';
import { openCredentialsDocument } from './credentials-document-store';
import { remainingLifetimeSeconds } from './data-space-manager';

describe('remainingLifetimeSeconds', () => {
  // `Invitation.lifetime` is a protobuf int32; a fractional value fails to encode, which killed the
  // `queryInvitations` stream and hung client initialization.
  test('is always a whole number', () => {
    for (const offset of [604_799_123, 1, 999, 86_400_000, 1_500]) {
      expect(Number.isInteger(remainingLifetimeSeconds(new Date(Date.now() + offset)))).toBe(true);
    }
  });

  // 0 means "never expires", so an expired invitation must not clamp to it.
  test('an already-expired invitation stays expired', () => {
    expect(remainingLifetimeSeconds(new Date(Date.now() - 86_400_000))).toBe(1);
  });
});

describe('DataSpaceManager', () => {
  test('create space', async () => {
    const builder = new TestBuilder();

    const peer = builder.createPeer();
    await peer.createIdentity();
    await openAndClose(peer.echoHost, peer.dataSpaceManager);

    const space = await peer.dataSpaceManager.createSpace(new Context());

    // Process all written mutations.
    await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);

    expect(space.inner.spaceState.genesisCredential).to.exist;
    expect(space.inner.spaceState.members.size).to.equal(1);
    expect(space.inner.spaceState.feeds.size).to.equal(2);
    expect(space.inner.protocol.feeds.size).to.equal(2);
  });

  test('an anchored space still takes its id from the space genesis key', async () => {
    const builder = new TestBuilder();

    const peer = builder.createPeer({ dataSpaceProps: { automergeCredentials: true } });
    await peer.createIdentity();
    await openAndClose(peer.echoHost, peer.dataSpaceManager);

    const space = await peer.dataSpaceManager.createSpace(new Context());
    await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);

    // The root anchors the credentials document; it does not identify the space. Both derivations
    // stay on the space key, so a peer that never sees the root still computes the same id.
    const refs = peer.echoHost.getSpaceRootRefs(space.id);
    expect(space.id).to.equal(await createIdFromSpaceKey(space.key));

    // The admitted member can still find the root from the genesis credentials alone.
    const memberCredential = space.inner.spaceState.credentials.find(
      (credential) => getCredentialAssertion(credential)['@type'] === 'dxos.halo.credentials.SpaceMember',
    );
    const assertion = getCredentialAssertion(memberCredential!) as SpaceMemberAssertion;
    expect(assertion.spaceRootUrl).to.equal(refs!.spaceRootDocUrl);
  });

  test('without the automergeCredentials flag a space is key-derived and never anchors', async () => {
    const builder = new TestBuilder();

    // The product default: the flag is off, so nothing opts in to the automerge scheme.
    const peer = builder.createPeer({ dataSpaceProps: { automergeCredentials: false } });
    await peer.createIdentity();
    await openAndClose(peer.echoHost, peer.dataSpaceManager);

    const space = await peer.dataSpaceManager.createSpace(new Context());
    await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);

    expect(space.id).to.equal(await createIdFromSpaceKey(space.key));
    expect(peer.echoHost.getSpaceRootRefs(space.id)).to.be.undefined;
    expect(space.inner.spaceState.genesisCredential).to.exist;

    // Reloading must not migrate it either — that is the behaviour the flag gates.
    await peer.dataSpaceManager.close();
    peer.props.dataSpaceManager = undefined;
    await openAndClose(peer.dataSpaceManager);

    const reloaded = getFirstSpace(peer);
    await reloaded.activate(new Context());
    await asyncTimeout(
      reloaded.stateUpdate.waitForCondition(() => reloaded.state === SpaceState.SPACE_READY),
      5_000,
    );
    expect(peer.echoHost.getSpaceRootRefs(space.id)).to.be.undefined;
  });

  test('a legacy space can still be created, for migration coverage', async () => {
    const builder = new TestBuilder();

    const peer = builder.createPeer();
    await peer.createIdentity();
    await openAndClose(peer.echoHost, peer.dataSpaceManager);

    const space = await peer.dataSpaceManager.createSpace(new Context(), { useSpaceRootDocument: false });
    expect(space.id).to.equal(await createIdFromSpaceKey(space.key));
    expect(peer.echoHost.getSpaceRootRefs(space.id)).to.be.undefined;
  });

  test('an admitted peer agrees with the creator about the space id', async () => {
    const builder = new TestBuilder();

    const peer1 = builder.createPeer();
    await peer1.createIdentity();

    const peer2 = builder.createPeer();
    await peer2.createIdentity();

    await openAndClose(peer1.echoHost, peer1.dataSpaceManager, peer2.echoHost, peer2.dataSpaceManager);
    await connectReplicators([peer1, peer2]);

    const space1 = await peer1.dataSpaceManager.createSpace(new Context());
    await space1.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);

    const memberCredential = await peer1.dataSpaceManager.admitMember({
      spaceKey: space1.key,
      identityKey: peer2.identity.identityKey,
      role: SpaceMember.Role.ADMIN,
    });

    // admitMember resolves the root itself, so the credential carries it without the caller passing it.
    const assertion = getCredentialAssertion(memberCredential) as SpaceMemberAssertion;
    expect(assertion.spaceRootUrl).to.equal(peer1.echoHost.getSpaceRootRefs(space1.id)?.spaceRootDocUrl);

    const space2 = await peer2.dataSpaceManager.acceptSpace(new Context(), {
      spaceKey: space1.key,
      genesisFeedKey: space1.inner.genesisFeedKey,
      spaceRootUrl: assertion.spaceRootUrl,
    });
    await peer2.dataSpaceManager.waitUntilSpaceReady(space2.key);

    // Both sides derive from the space key, so they agree without the root having to carry the id.
    expect(space2.id).to.equal(space1.id);
    expect(space2.id).to.equal(await createIdFromSpaceKey(space1.key));
  });

  test('an accepted space is still reported to edge after the invitation context is disposed', async () => {
    const builder = new TestBuilder();

    // Edge rejects a root whose documents have not replicated to it yet, so the report is retried.
    // The invitation accept flow disposes its context as soon as `acceptSpace` returns, and a retry
    // scheduled on that context would be cancelled — leaving the space on its control feed forever.
    const attempts: string[] = [];
    const reported = new Trigger<void>();
    const edgeHttpClient = {
      recordSpaceRoot: async (_ctx: Context, spaceId: string, body: { rootDocumentUrl: string }) => {
        attempts.push(spaceId);
        if (attempts.length === 1) {
          throw new Error('not replicated to edge yet');
        }
        reported.wake();
        return body;
      },
    } as unknown as EdgeHttpClient;

    const peer1 = builder.createPeer({ dataSpaceProps: { automergeCredentials: true } });
    await peer1.createIdentity();

    const peer2 = builder.createPeer({ dataSpaceProps: { automergeCredentials: true }, edgeHttpClient });
    await peer2.createIdentity();

    await openAndClose(peer1.echoHost, peer1.dataSpaceManager, peer2.echoHost, peer2.dataSpaceManager);
    await connectReplicators([peer1, peer2]);

    const space1 = await peer1.dataSpaceManager.createSpace(new Context());
    await space1.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);

    const memberCredential = await peer1.dataSpaceManager.admitMember({
      spaceKey: space1.key,
      identityKey: peer2.identity.identityKey,
      role: SpaceMember.Role.ADMIN,
    });
    const assertion = getCredentialAssertion(memberCredential) as SpaceMemberAssertion;

    // The context the invitation flow owns, disposed the moment the accept returns.
    const invitationCtx = new Context();
    const space2 = await peer2.dataSpaceManager.acceptSpace(invitationCtx, {
      spaceKey: space1.key,
      genesisFeedKey: space1.inner.genesisFeedKey,
      spaceRootUrl: assertion.spaceRootUrl,
    });
    await peer2.dataSpaceManager.waitUntilSpaceReady(space2.key);
    await invitationCtx.dispose();

    // The retry has to outlive that disposal.
    await reported.wait({ timeout: 5_000 });
    expect(attempts.length).to.be.greaterThan(1);
  });

  test('an accepted space anchors on a root that replicates after the invitation context is gone', async ({
    expect,
  }) => {
    const builder = new TestBuilder();

    const peer1 = builder.createPeer({ dataSpaceProps: { automergeCredentials: true } });
    await peer1.createIdentity();
    const peer2 = builder.createPeer({ dataSpaceProps: { automergeCredentials: true } });
    await peer2.createIdentity();
    await openAndClose(peer1.echoHost, peer1.dataSpaceManager, peer2.echoHost, peer2.dataSpaceManager);

    const space1 = await peer1.dataSpaceManager.createSpace(new Context());
    await space1.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);

    const memberCredential = await peer1.dataSpaceManager.admitMember({
      spaceKey: space1.key,
      identityKey: peer2.identity.identityKey,
      role: SpaceMember.Role.ADMIN,
    });
    const assertion = getCredentialAssertion(memberCredential) as SpaceMemberAssertion;

    // Accepted before the peers can replicate, so the named root cannot be adopted on the first
    // attempt: only a retry that outlives the invitation can anchor this space.
    const invitationCtx = new Context();
    const space2 = await peer2.dataSpaceManager.acceptSpace(invitationCtx, {
      spaceKey: space1.key,
      genesisFeedKey: space1.inner.genesisFeedKey,
      spaceRootUrl: assertion.spaceRootUrl,
    });
    await invitationCtx.dispose();
    expect(peer2.echoHost.getSpaceRootRefs(space2.id)).to.be.undefined;

    await connectReplicators([peer1, peer2]);
    await expect
      .poll(() => peer2.echoHost.getSpaceRootRefs(space2.id)?.spaceRootDocUrl, { timeout: 10_000 })
      .to.equal(assertion.spaceRootUrl);
  });

  test('a legacy hypercore space migrates onto a space root document, keeping its id', async () => {
    const builder = new TestBuilder();

    const peer = builder.createPeer();
    await peer.createIdentity();
    await openAndClose(peer.echoHost, peer.dataSpaceManager);

    // Old style: credential chain in the control feed, id derived from the space key.
    const space = await peer.dataSpaceManager.createSpace(new Context(), { useSpaceRootDocument: false });
    await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);

    const legacyId = space.id;
    const directoryUrl = peer.echoHost.spaces.find(({ spaceId }) => spaceId === legacyId)?.rootDocUrl;
    expect(legacyId).to.equal(await createIdFromSpaceKey(space.key));
    expect(peer.echoHost.getSpaceRootRefs(legacyId)).to.be.undefined;
    expect(space.inner.spaceState.genesisCredential).to.exist;
    const membersBefore = space.inner.spaceState.members.size;

    const refs = await peer.dataSpaceManager.migrateSpaceToRootDocument(new Context(), space.key);

    // The id is unchanged — it was minted from the space key and no document can reproduce it.
    expect(space.id).to.equal(legacyId);
    expect(refs.spaceRootDocUrl).to.not.equal(directoryUrl);

    const root = await peer.echoHost.loadDoc<SpaceRoot>(new Context(), refs.spaceRootDocUrl);
    expect(isSpaceRoot(root?.doc())).to.be.true;
    expect(root!.doc()!.spaceId).to.equal(legacyId);
    expect(root!.doc()!.directory).to.equal(directoryUrl);

    // The control feed keeps working: migration adds the anchor, it does not move credentials yet.
    expect(space.inner.spaceState.genesisCredential).to.exist;
    expect(space.inner.spaceState.members.size).to.equal(membersBefore);

    // Idempotent: a re-run must not fork the anchor.
    const again = await peer.dataSpaceManager.migrateSpaceToRootDocument(new Context(), space.key);
    expect(again.spaceRootDocUrl).to.equal(refs.spaceRootDocUrl);
  });

  test('data written before migration is still readable through the space root afterwards', async () => {
    const builder = new TestBuilder();

    const peer = builder.createPeer();
    await peer.createIdentity();
    await openAndClose(peer.echoHost, peer.dataSpaceManager);

    const space = await peer.dataSpaceManager.createSpace(new Context(), { useSpaceRootDocument: false });
    await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);

    // Data the application wrote while the space was still hypercore-backed.
    const objectId = PublicKey.random().toHex();
    const objectUrl = (await peer.echoHost.createDoc({})).url;
    const before = await peer.echoHost.openSpaceRoot(new Context(), space.id);
    before.change((draft: DatabaseDirectory) => {
      draft.links ??= {};
      draft.links[objectId] = objectUrl;
    });
    const directoryUrl = before.url;

    await peer.dataSpaceManager.migrateSpaceToRootDocument(new Context(), space.key);

    // Migration anchors the space on a root document; the directory it points at is the same one,
    // so nothing the application stored has to move for the space to keep resolving.
    const after = await peer.echoHost.openSpaceRoot(new Context(), space.id);
    expect(after.url).to.equal(directoryUrl);
    expect(after.doc()?.links?.[objectId]).to.equal(objectUrl);
  });

  test('a legacy space anchors itself on the next load, with nobody calling migrate', async () => {
    const builder = new TestBuilder();

    const peer = builder.createPeer({ dataSpaceProps: { automergeCredentials: true } });
    await peer.createIdentity();
    await openAndClose(peer.echoHost, peer.dataSpaceManager);

    const space = await peer.dataSpaceManager.createSpace(new Context(), { useSpaceRootDocument: false });
    await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);
    const legacyId = space.id;

    // A space created legacy stays unanchored for the session that created it, so that the next
    // load is the one that migrates it.
    expect(peer.echoHost.getSpaceRootRefs(legacyId)).to.be.undefined;

    // A restart, not just a reopen: the suppression above lives on the manager instance, and a
    // reopened one would still be the session that created the space.
    await peer.dataSpaceManager.close();
    peer.props.dataSpaceManager = undefined;
    await openAndClose(peer.dataSpaceManager);

    // Anchoring waits for the space to be open, so a lazily loaded space migrates when it is used.
    const reloaded = getFirstSpace(peer);
    expect(reloaded.id).to.equal(legacyId);
    await reloaded.activate(new Context());

    // Nothing calls migrateSpaceToRootDocument — opening the space is what anchors it.
    await waitForCondition({ condition: () => peer.echoHost.getSpaceRootRefs(legacyId) !== undefined });
  });

  test('a credential deleted from the document is still read back', async () => {
    const builder = new TestBuilder();

    const peer = builder.createPeer({ dataSpaceProps: { automergeCredentials: true } });
    await peer.createIdentity();
    await openAndClose(peer.echoHost, peer.dataSpaceManager);

    const space = await peer.dataSpaceManager.createSpace(new Context());
    const store = await openCredentialsDocument(new Context(), peer.echoHost, space.id);
    await waitForCondition({ condition: () => store.read().length > 0 });

    const before = store.read().map(({ id }) => id);
    const handle = await peer.echoHost.loadDoc<CredentialsDocument>(
      new Context(),
      peer.echoHost.getSpaceRootRefs(space.id)!.credentialsDocUrl!,
    );

    // A member with write access revokes another by deleting their credential.
    handle!.change((doc: CredentialsDocument) => {
      delete doc.credentials[before[0]];
    });
    expect(Object.keys(handle!.doc()!.credentials)).to.not.contain(before[0]);

    expect(store.read().map(({ id }) => id)).to.deep.equal(before);
  });

  test('a migrated space mirrors its control-feed credentials into the credentials document', async () => {
    const builder = new TestBuilder();

    const peer = builder.createPeer();
    await peer.createIdentity();
    await openAndClose(peer.echoHost, peer.dataSpaceManager);

    const space = await peer.dataSpaceManager.createSpace(new Context(), { useSpaceRootDocument: false });
    await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);
    await peer.dataSpaceManager.migrateSpaceToRootDocument(new Context(), space.key);

    // Admit a second member, so the chain the document has to reproduce includes an admission
    // credential and a role — not just genesis and this device.
    const invitee = await peer.keyring.createKey();
    await peer.dataSpaceManager.admitMember({
      spaceKey: space.key,
      identityKey: invitee,
      role: SpaceMember.Role.EDITOR,
    });

    // The admission must have been processed by the feed before the document can be expected to
    // mirror it.
    await waitForCondition({
      condition: () => [...space.inner.spaceState.members.keys()].some((key) => key.equals(invitee)),
    });

    const store = await openCredentialsDocument(new Context(), peer.echoHost, space.id);
    const feedCredentialIds = () => space.inner.spaceState.credentials.map((credential) => credential.id!.toHex());

    // DataSpaceManager mirrors credentials as they are processed, so the document fills on its own;
    // both sides are re-read on every poll because the feed can still be delivering.
    await waitForCondition({
      condition: () => {
        const inDocument = new Set(store.read().map(({ id }) => id));
        const ids = feedCredentialIds();
        return ids.length > 0 && ids.every((id) => inDocument.has(id));
      },
    });

    // One snapshot from here on: comparing reads taken at different instants is what made this flaky.
    const replayable = store.read();
    const fromDocument = replayable.map(({ id }) => id);
    expect(new Set(fromDocument).size).to.equal(fromDocument.length);
    for (const id of feedCredentialIds()) {
      expect(fromDocument).to.contain(id);
    }

    // Appending again is a no-op, which is what makes the migration backfill re-runnable.
    const before = store.read().length;
    for (const { credential } of replayable) {
      store.append(credential);
    }
    expect(store.read().length).to.equal(before);

    // The document is linked from the root, which is what the per-space source flip keys off.
    expect(peer.echoHost.getSpaceRootRefs(space.id)?.credentialsDocUrl).to.equal(store.url);

    // Replaying into a fresh state machine must reach the same state the feed did: this is the
    // equivalence the source flip depends on.
    const replayed = new SpaceStateMachine(space.key);
    for (const { credential } of replayable) {
      expect(await replayed.process(credential, { sourceFeed: space.inner.genesisFeedKey })).to.be.true;
    }

    expect(replayed.genesisCredential?.id?.toHex()).to.equal(space.inner.spaceState.genesisCredential?.id?.toHex());
    for (const key of replayed.members.keys()) {
      expect([...space.inner.spaceState.members.keys()].map((member) => member.toHex())).to.contain(key.toHex());
    }
    expect(replayed.membershipPolicy).to.equal(space.inner.spaceState.membershipPolicy);

    // The admitted member and its role survive the round trip, which is the part the feed carried
    // and the document now has to carry instead.
    const replayedInvitee = [...replayed.members.entries()].find(([key]) => key.equals(invitee));
    expect(replayedInvitee, 'the admitted member is missing from the replayed state').to.exist;
    expect(replayedInvitee![1].role).to.equal(SpaceMember.Role.EDITOR);
  });

  test('sync between peers', async () => {
    const builder = new TestBuilder();

    const peer1 = builder.createPeer();
    await peer1.createIdentity();

    const peer2 = builder.createPeer();
    await peer2.createIdentity();

    await openAndClose(peer1.echoHost, peer1.dataSpaceManager, peer2.echoHost, peer2.dataSpaceManager);
    await connectReplicators([peer1, peer2]);

    const space1 = await peer1.dataSpaceManager.createSpace(new Context());
    await space1.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);

    // Admit peer2 to space1.
    await writeMessages(
      space1.inner.controlPipeline.writer,
      await createAdmissionCredentials({
        signer: peer1.identity.credentialSigner,
        identityKey: peer2.identity.identityKey,
        spaceKey: space1.key,
        genesisFeedKey: space1.inner.genesisFeedKey,
      }),
    );

    // Accept must be called after admission so that the peer can authenticate for notarization.
    const space2 = await peer2.dataSpaceManager.acceptSpace(new Context(), {
      spaceKey: space1.key,
      genesisFeedKey: space1.inner.genesisFeedKey,
    });
    await peer2.dataSpaceManager.waitUntilSpaceReady(space2.key);

    log('', {
      peer1: {
        identity: peer1.identity.identityKey,
        device: peer1.identity.deviceKey,
        control: space1.inner.controlFeedKey,
        data: space1.inner.dataFeedKey,
      },
      peer2: {
        identity: peer2.identity.identityKey,
        device: peer2.identity.deviceKey,
        control: space2.inner.controlFeedKey,
        data: space2.inner.dataFeedKey,
      },
    });

    await space1.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);
    await space2.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);

    log('', {
      space1: {
        timeframe: space1.inner.controlPipeline.state.timeframe,
        endTimeframe: space1.inner.controlPipeline.state.endTimeframe,
      },
      space2: {
        timeframe: space2.inner.controlPipeline.state.timeframe,
        endTimeframe: space2.inner.controlPipeline.state.endTimeframe,
      },
    });
    log.break();

    expect(space1.inner.protocol.sessions.get(peer2.identity.deviceKey)).to.exist;
    expect(space1.inner.protocol.sessions.get(peer2.identity.deviceKey)?.authStatus).to.equal(AuthStatus.SUCCESS);
    expect(space2.inner.protocol.sessions.get(peer1.identity.deviceKey)).to.exist;
    expect(space2.inner.protocol.sessions.get(peer1.identity.deviceKey)?.authStatus).to.equal(AuthStatus.SUCCESS);
  });

  test('pub/sub API', async () => {
    const builder = new TestBuilder();

    const peer1 = builder.createPeer();
    await peer1.createIdentity();

    const peer2 = builder.createPeer();
    await peer2.createIdentity();
    await peer2.dataSpaceManager.open();

    await openAndClose(peer1.echoHost, peer1.dataSpaceManager, peer2.echoHost, peer2.dataSpaceManager);
    await connectReplicators([peer1, peer2]);

    const space1 = await peer1.dataSpaceManager.createSpace(new Context());
    await space1.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);

    // Admit peer2 to space1.
    await writeMessages(
      space1.inner.controlPipeline.writer,
      await createAdmissionCredentials({
        signer: peer1.identity.credentialSigner,
        identityKey: peer2.identity.identityKey,
        spaceKey: space1.key,
        genesisFeedKey: space1.inner.genesisFeedKey,
      }),
    );

    // Accept must be called after admission so that the peer can authenticate for notarization.
    const space2 = await peer2.dataSpaceManager.acceptSpace(new Context(), {
      spaceKey: space1.key,
      genesisFeedKey: space1.inner.genesisFeedKey,
    });

    // Coincidentally, this also waits until a P2P connection is established between peers.
    // TODO(dmaretskyi): Refine this to wait for connection specifically.
    await peer2.dataSpaceManager.waitUntilSpaceReady(space2.key);

    const [receivedMessage, inc] = latch({ count: 1 });
    space2.listen('test', (message) => {
      expect(message.channelId).to.equal('test');
      inc();
    });

    await space1.postMessage('test', { '@type': 'google.protobuf.Any', 'test': true });
    await receivedMessage();
  });

  test('create space with tags', async () => {
    const builder = new TestBuilder();
    const peer = builder.createPeer();
    await peer.createIdentity();
    await openAndClose(peer.echoHost, peer.dataSpaceManager);

    const space = await peer.dataSpaceManager.createSpace(new Context(), { tags: ['personal', 'test'] });
    await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);

    expect(space.inner.spaceState.tags).toEqual(['personal', 'test']);
    expect(space.inner.spaceState.genesisCredential).to.exist;
  });

  test('create space without tags has empty tags', async () => {
    const builder = new TestBuilder();
    const peer = builder.createPeer();
    await peer.createIdentity();
    await openAndClose(peer.echoHost, peer.dataSpaceManager);

    const space = await peer.dataSpaceManager.createSpace(new Context());
    await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);

    expect(space.inner.spaceState.tags).toEqual([]);
  });

  test('tags propagate through peer admission', async () => {
    const builder = new TestBuilder();
    const peer1 = builder.createPeer();
    await peer1.createIdentity();
    const peer2 = builder.createPeer();
    await peer2.createIdentity();

    await openAndClose(peer1.echoHost, peer1.dataSpaceManager, peer2.echoHost, peer2.dataSpaceManager);
    await connectReplicators([peer1, peer2]);

    const space1 = await peer1.dataSpaceManager.createSpace(new Context(), { tags: ['personal'] });
    await space1.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.endTimeframe);

    // Admit peer2 to space1.
    await writeMessages(
      space1.inner.controlPipeline.writer,
      await createAdmissionCredentials({
        signer: peer1.identity.credentialSigner,
        identityKey: peer2.identity.identityKey,
        spaceKey: space1.key,
        genesisFeedKey: space1.inner.genesisFeedKey,
        tags: space1.inner.spaceState.tags,
      }),
    );

    const space2 = await peer2.dataSpaceManager.acceptSpace(new Context(), {
      spaceKey: space1.key,
      genesisFeedKey: space1.inner.genesisFeedKey,
      tags: space1.inner.spaceState.tags,
    });
    await peer2.dataSpaceManager.waitUntilSpaceReady(space2.key);

    // Peer2's space should have the same tags.
    expect(space2.inner.spaceState.tags).toEqual(['personal']);
  });

  describe('activation', () => {
    test('can activate and deactivate a space', async () => {
      const builder = new TestBuilder();

      const peer = builder.createPeer();
      await peer.createIdentity();
      await openAndClose(peer.echoHost, peer.dataSpaceManager);

      const space = await peer.dataSpaceManager.createSpace(new Context());
      await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);
      expect(space.state).to.equal(SpaceState.SPACE_READY);

      await space.deactivate(new Context());
      expect(space.state).to.equal(SpaceState.SPACE_INACTIVE);

      await space.activate(new Context());
      await asyncTimeout(
        space.stateUpdate.waitForCondition(() => space.state === SpaceState.SPACE_READY),
        500,
      );
    });

    test('activate opens a lazily loaded space', async () => {
      const builder = new TestBuilder();

      const peer = builder.createPeer();
      await peer.createIdentity();
      await openAndClose(peer.echoHost, peer.dataSpaceManager);

      await peer.dataSpaceManager.createSpace(new Context());
      await reloadDataSpaces(peer);

      const space = getFirstSpace(peer);
      expect(space.state).to.equal(SpaceState.SPACE_CLOSED);
      await space.activate(new Context());
      await asyncTimeout(
        space.stateUpdate.waitForCondition(() => space.state === SpaceState.SPACE_READY),
        500,
      );
    });

    test('deactivate lazily loaded space ', async () => {
      const builder = new TestBuilder();

      const peer = builder.createPeer();
      await peer.createIdentity();
      await openAndClose(peer.echoHost, peer.dataSpaceManager);

      await peer.dataSpaceManager.createSpace(new Context());
      await reloadDataSpaces(peer);

      await getFirstSpace(peer).deactivate(new Context());

      await reloadDataSpaces(peer);

      expect(getFirstSpace(peer).state).to.eq(SpaceState.SPACE_INACTIVE);
    });
  });

  describe('deletion', () => {
    test('markSpaceDeleted unloads the space and records a tombstone', async () => {
      const builder = new TestBuilder();

      const peer = builder.createPeer();
      await peer.createIdentity();
      await openAndClose(peer.echoHost, peer.dataSpaceManager);

      const space = await peer.dataSpaceManager.createSpace(new Context());
      await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);
      const spaceKey = space.key;

      await peer.dataSpaceManager.markSpaceDeleted(new Context(), spaceKey);

      expect(peer.dataSpaceManager.spaces.has(spaceKey)).to.be.false;
      expect(peer.dataSpaceManager.isSpaceDeleted(spaceKey)).to.be.true;
      expect(space.state).to.equal(SpaceState.SPACE_DELETED);
    });

    test('markSpaceDeleted is idempotent', async () => {
      const builder = new TestBuilder();

      const peer = builder.createPeer();
      await peer.createIdentity();
      await openAndClose(peer.echoHost, peer.dataSpaceManager);

      const space = await peer.dataSpaceManager.createSpace(new Context());
      await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);

      await peer.dataSpaceManager.markSpaceDeleted(new Context(), space.key);
      await peer.dataSpaceManager.markSpaceDeleted(new Context(), space.key);

      expect(peer.dataSpaceManager.isSpaceDeleted(space.key)).to.be.true;
    });

    test('deleted space is not reloaded after restart', async () => {
      const builder = new TestBuilder();

      const peer = builder.createPeer();
      await peer.createIdentity();
      await openAndClose(peer.echoHost, peer.dataSpaceManager);

      const space = await peer.dataSpaceManager.createSpace(new Context());
      await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);
      const spaceKey = space.key;

      await peer.dataSpaceManager.markSpaceDeleted(new Context(), spaceKey);
      await reloadDataSpaces(peer);

      expect(peer.dataSpaceManager.spaces.has(spaceKey)).to.be.false;
      expect(peer.dataSpaceManager.isSpaceDeleted(spaceKey)).to.be.true;
    });

    test('handleRemoteSpaceDeleted tombstones a loaded space', async () => {
      const builder = new TestBuilder();

      const peer = builder.createPeer();
      await peer.createIdentity();
      await openAndClose(peer.echoHost, peer.dataSpaceManager);

      const space = await peer.dataSpaceManager.createSpace(new Context());
      await space.inner.controlPipeline.state.waitUntilTimeframe(space.inner.controlPipeline.state.endTimeframe);
      const spaceKey = space.key;

      await peer.dataSpaceManager.handleRemoteSpaceDeleted(new Context(), spaceKey);

      expect(peer.dataSpaceManager.spaces.has(spaceKey)).to.be.false;
      expect(peer.dataSpaceManager.isSpaceDeleted(spaceKey)).to.be.true;
    });

    test('acceptSpace refuses a tombstoned space (out-of-order guard)', async () => {
      const builder = new TestBuilder();

      const peer = builder.createPeer();
      await peer.createIdentity();
      await openAndClose(peer.echoHost, peer.dataSpaceManager);

      // Tombstone arrives before the SpaceMember credential would trigger acceptSpace.
      const spaceKey = PublicKey.random();
      await peer.dataSpaceManager.handleRemoteSpaceDeleted(new Context(), spaceKey);
      expect(peer.dataSpaceManager.isSpaceDeleted(spaceKey)).to.be.true;

      await expect(
        peer.dataSpaceManager.acceptSpace(new Context(), { spaceKey, genesisFeedKey: PublicKey.random() }),
      ).rejects.toThrow();
    });
  });

  const connectReplicators = (peers: TestPeer[]) => {
    return Promise.all(peers.map((peer) => peer.echoHost.addReplicator(Context.default(), peer.meshEchoReplicator)));
  };

  const reloadDataSpaces = async (peer: TestPeer) => {
    await peer.dataSpaceManager.close();
    await peer.dataSpaceManager.open();
  };

  const getFirstSpace = (peer: TestPeer) => {
    return Array.from(peer.dataSpaceManager.spaces.values())[0];
  };
});
