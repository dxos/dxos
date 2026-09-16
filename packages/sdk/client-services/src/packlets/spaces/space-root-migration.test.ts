//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { chain } from '@dxos/async';
import { Context } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { Invitation_Kind } from '@dxos/protocols/buf/dxos/client/invitation_pb';

import { type ServiceContext, createPeers, performInvitation } from '../testing/index.ts';

const closeAfterTest = async (peer: ServiceContext) => {
  onTestFinished(async () => {
    await peer.close();
  });
  return peer;
};

/**
 * Stands in for edge as the single writer of a legacy space's root.
 *
 * ONE instance is shared by every peer, which is the property under test: edge mints once per space
 * and hands every caller the same root, so two devices of one identity cannot each anchor their own.
 * It mints in a designated host because the minted documents have to live somewhere the other peers
 * can replicate them from — edge would hold them itself.
 *
 * `allow` gates which spaces edge will anchor, standing in for a space whose migration has not been
 * reached yet: asking about one is refused, exactly as edge refuses a space it has no directory for.
 */
class TestEdge {
  /** The write-once registry record: space -> the root in force. */
  readonly #roots = new Map<SpaceId, string>();
  readonly #allowed = new Set<SpaceId>();
  #mintingHost?: ServiceContext;

  setMintingHost(peer: ServiceContext): void {
    this.#mintingHost = peer;
  }

  allow(...spaceIds: SpaceId[]): void {
    for (const spaceId of spaceIds) {
      this.#allowed.add(spaceId);
    }
  }

  /** The root edge has anchored, or undefined for a space it has not. */
  rootOf(spaceId: SpaceId): string | undefined {
    return this.#roots.get(spaceId);
  }

  readonly client: EdgeHttpClient = {
    // The stack sets the identity on every HTTP client once the identity opens; edge needs none here.
    setIdentity: () => {},
    recordSpaceRoot: async (_ctx: Context, spaceId: SpaceId, body: { rootDocumentUrl?: string }) => {
      const recorded = this.#roots.get(spaceId);
      if (recorded !== undefined) {
        return { rootDocumentUrl: recorded };
      }
      if (body.rootDocumentUrl !== undefined) {
        this.#roots.set(spaceId, body.rootDocumentUrl);
        return { rootDocumentUrl: body.rootDocumentUrl };
      }
      if (!this.#allowed.has(spaceId)) {
        throw new Error(`edge has not anchored ${spaceId}`);
      }

      invariant(this.#mintingHost, 'no minting host registered');
      const refs = await this.#mintingHost.echoHost.migrateSpaceToRootDocument(new Context(), spaceId);
      invariant(refs, `edge has no directory to anchor for ${spaceId}`);
      this.#roots.set(spaceId, refs.spaceRootDocUrl);
      return { rootDocumentUrl: refs.spaceRootDocUrl };
    },
  } as unknown as EdgeHttpClient;
}

/** The space as this peer holds it; every peer must have been admitted to it first. */
const spaceOn = (peer: ServiceContext, spaceKey: PublicKey) => {
  const space = peer.dataSpaceManager!.spaces.get(spaceKey);
  invariant(space, 'space not present on this peer');
  return space;
};

describe('spaces/space-root-migration', () => {
  test(
    'one identity on two devices, sharing two spaces with another identity',
    { timeout: 300_000 },
    async ({ expect }) => {
      const edge = new TestEdge();
      // Every peer gets the SAME client: edge is one writer, not one per device.
      const [a1, a2, b1] = await chain<ServiceContext>([closeAfterTest])(
        createPeers(3, undefined, { automergeCredentials: true }, edge.client),
      );
      edge.setMintingHost(a1);

      //
      // Topology: identity A on A1 + A2, identity B on B1, both spaces shared with B.
      //
      const identityA = await a1.createIdentity();
      await Promise.all(performInvitation({ host: a1, guest: a2, options: { kind: Invitation_Kind.DEVICE } }));
      expect(a2.identityManager.identity?.identityKey).to.deep.equal(identityA.identityKey);
      await b1.createIdentity();

      const s1 = await a1.dataSpaceManager!.createSpace(new Context(), { useSpaceRootDocument: false });
      const s2 = await a1.dataSpaceManager!.createSpace(new Context(), { useSpaceRootDocument: false });
      for (const space of [s1, s2]) {
        await Promise.all(
          performInvitation({
            host: a1,
            guest: b1,
            options: { kind: Invitation_Kind.SPACE, spaceKey: fromPublicKey(space.key) },
          }),
        );
      }

      // Both spaces reach B, and both are still on their control feed: a space created legacy is not
      // anchored in the session that created it, and edge has been told to anchor neither.
      await expect.poll(() => b1.dataSpaceManager!.spaces.has(s1.key), { timeout: 60_000 }).to.equal(true);
      await expect.poll(() => b1.dataSpaceManager!.spaces.has(s2.key), { timeout: 60_000 }).to.equal(true);
      expect(a1.echoHost.getSpaceRootRefs(s1.id)).to.be.undefined;
      expect(a1.echoHost.getSpaceRootRefs(s2.id)).to.be.undefined;

      //
      // A1 migrates S1 only.
      //
      edge.allow(s1.id);
      await a1.dataSpaceManager!.migrateSpaceToRootDocument(new Context(), s1.key);

      const s1Root = edge.rootOf(s1.id);
      expect(s1Root, 'edge anchored S1').to.be.a('string');
      expect(a1.echoHost.getSpaceRootRefs(s1.id)?.spaceRootDocUrl).to.equal(s1Root);

      //
      // A2 and B1 respect the root edge minted — the same one, not their own.
      //
      for (const [name, peer] of [
        ['A2', a2],
        ['B1', b1],
      ] as const) {
        await spaceOn(peer, s1.key).activate(new Context());
        await expect
          .poll(() => peer.echoHost.getSpaceRootRefs(s1.id)?.spaceRootDocUrl, { timeout: 120_000 })
          .to.equal(s1Root);
        expect(edge.rootOf(s1.id), `${name} did not re-anchor S1`).to.equal(s1Root);
      }

      //
      // S2 was never migrated: no peer anchors it, and it keeps working off its control feed.
      //
      for (const peer of [a1, a2, b1]) {
        expect(peer.echoHost.getSpaceRootRefs(s2.id)).to.be.undefined;
      }
      expect(edge.rootOf(s2.id)).to.be.undefined;
      // The feed-backed chain still resolves: B is a member of S2 and the genesis credential stands.
      const s2OnB1 = spaceOn(b1, s2.key);
      await expect
        .poll(() => s2OnB1.inner.spaceState.genesisCredential !== undefined, { timeout: 60_000 })
        .to.equal(true);
      // Polled, not read once: B's own admission reaches it over the control feed, so the member set
      // is only eventually both identities.
      await expect.poll(() => s2OnB1.inner.spaceState.members.size > 1, { timeout: 60_000 }).to.equal(true);

      //
      // The HALO is anchored too, and A's devices keep access: a space A1 creates afterwards still
      // reaches A2, which it can only do on credentials both devices agree about.
      //
      // The halo anchors in the background once the identity exists, so this is polled too.
      await expect
        .poll(() => typeof a1.echoHost.getSpaceRootRefs(identityA.haloSpaceId)?.spaceRootDocUrl === 'string', {
          timeout: 120_000,
        })
        .to.equal(true);
      const haloRefs = a1.echoHost.getSpaceRootRefs(identityA.haloSpaceId);
      await expect
        .poll(() => a2.echoHost.getSpaceRootRefs(identityA.haloSpaceId)?.spaceRootDocUrl, { timeout: 120_000 })
        .to.equal(haloRefs!.spaceRootDocUrl);

      const s3 = await a1.dataSpaceManager!.createSpace(new Context());
      await expect.poll(() => a2.dataSpaceManager!.spaces.has(s3.key), { timeout: 120_000 }).to.equal(true);
      expect(a2.identityManager.identity?.identityKey).to.deep.equal(identityA.identityKey);
    },
  );
});
