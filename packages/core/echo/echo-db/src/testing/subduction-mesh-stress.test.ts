//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { MeshEchoReplicator } from '@dxos/echo-pipeline';
import { PublicKey } from '@dxos/keys';
import { TestBuilder as TeleportBuilder, TestPeer as TeleportPeer } from '@dxos/teleport/testing';
import { range } from '@dxos/util';

import { EchoTestBuilder } from './echo-test-builder';

// Reproducer for the production symptom "test creation hangs on Nth space when
// `runtime.client.edgeFeatures.subductionReplicator: true` is set in dx-local.yml".
//
// Wires two `EchoHost`s in subduction mode through `MeshEchoReplicator` over
// an in-memory teleport connection — the same path the production p2p code
// takes once the feature flag is on (see
// `packages/sdk/client-services/src/packlets/services/service-context.ts`
// and `packages/sdk/client/src/tests/spaces-invitations-subduction.test.ts`).
//
// The lower-level `packages/automerge-repo/test/subduction/AddBatchLatencyGrowth.test.ts`
// already isolates the per-doc broadcast antipattern at the raw `Repo` level
// (5x average `addBatch` ms growth over 200 sids, perfectly matching the H12
// debug-mode close-out). These tests assert the same scaling problem surfaces
// through the production stack, where each new local commit on host1 is
// followed by an `addBatch` whose `sync_with_all_peers(sid)` cost grows with
// the cumulative sid count.
//
// Setup notes:
// - `useSubduction: true` on both peers: the entire purpose of this test.
// - Each space has its own key (matching production); `authorizeSpace()`
//   authorizes the device pair on both sides for each new space, mirroring
//   what `MeshReplicator.authorizeDevice` is called with on a successful
//   invitation in production.
// - Doc -> space routing: a shared `documentToSpace` map is wired into both
//   peers' `getSpaceKeyByRootDocumentId` so each newly-created doc lands in
//   a known space (bypasses `findSpaceByRootDocumentId` from SpaceManager).
// - A connected peer is required for the bug to surface — without one,
//   `addBatch`'s trailing `sync_with_all_peers(sid)` is a no-op and the
//   per-doc latency stays flat.

// Soft assertion threshold for last-wave / first-wave per-doc latency.
// Wave-0 includes wasm warmup and cold caches; under the bug the ratio is
// consistently >=3x over a few hundred sids. 2x tolerates warmup variance
// while still failing reliably under the bug.
const GROWTH_RATIO_THRESHOLD = 2;

describe('Subduction + MeshEchoReplicator scaling', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // Per-doc flush latency growth via raw `host.createDoc()`. This is the
  // closest analog to `AddBatchLatencyGrowth.test.ts` but at the EchoHost
  // level — same shape, same assertion, but routed through `AutomergeHost` +
  // `MeshEchoReplicator` instead of a `SpyNetworkAdapter` directly.
  //
  // NOTE: per-wave flush coalesces the addBatch broadcasts (a single flush
  // serves N pending commits), so the per-doc growth signal is dampened
  // compared to the spaces test below where each iteration triggers its own
  // flush. Kept here as a baseline; the diagnostic table is the primary
  // signal.
  test(
    'creating N raw docs through MeshEchoReplicator in subduction mode',
    { timeout: 120_000 },
    async ({ expect }) => {
      const TOTAL_DOCS = 500;
      const WAVES = 10;
      const DOCS_PER_WAVE = TOTAL_DOCS / WAVES;

      const setup = await setupConnectedPeers(builder);
      const spaceKey = await authorizeSpace(setup.replicator1, setup.replicator2, setup.tp1, setup.tp2);
      setup.setFallbackSpace(spaceKey);
      const peer1 = setup.peer1;

      const flushes: number[] = [];
      for (let wave = 0; wave < WAVES; ++wave) {
        const t0 = performance.now();
        for (let i = 0; i < DOCS_PER_WAVE; ++i) {
          await peer1.host.createDoc({ wave, idx: i, payload: 'x'.repeat(64) });
        }
        await peer1.host.flush(Context.default());
        flushes.push(performance.now() - t0);
      }

      const table = formatDiagnosticTable('raw docs', { flushes, docsPerWave: DOCS_PER_WAVE });
      // eslint-disable-next-line no-console
      console.log(table);

      const ratio = flushes[WAVES - 1] / flushes[0];
      expect(
        ratio,
        `per-doc flush latency grew ${ratio.toFixed(2)}x from wave 0 to wave ${WAVES - 1}\n${table}`,
      ).toBeLessThan(GROWTH_RATIO_THRESHOLD);
    },
  );

  // Mirror of the actual production symptom: "test creation hangs on Nth
  // space". Each space root is one new sid for the AutomergeHost; the
  // production hang implies super-linear growth in `createSpaceRoot` →
  // flush time as N increases.
  //
  // `createSpaceRoot` does its own internal `flush` per call, so unlike the
  // raw-docs test above the addBatch broadcasts are NOT coalesced — every
  // iteration pays the full `sync_with_all_peers(sid)` cost across the
  // accumulated sids. This is the path that actually hangs in production.
  test('creating N spaces through MeshEchoReplicator in subduction mode', { timeout: 120_000 }, async ({ expect }) => {
    const TOTAL_SPACES = 50;
    const WAVES = 5;
    const SPACES_PER_WAVE = TOTAL_SPACES / WAVES;

    const setup = await setupConnectedPeers(builder);

    const waveTimings: number[] = [];
    for (let wave = 0; wave < WAVES; ++wave) {
      const t0 = performance.now();
      for (let i = 0; i < SPACES_PER_WAVE; ++i) {
        const spaceKey = await authorizeSpace(setup.replicator1, setup.replicator2, setup.tp1, setup.tp2);
        const root = await setup.peer1.host.createSpaceRoot(Context.default(), spaceKey);
        // Bind the new root's doc id → spaceKey on both sides so subduction's
        // policy resolves to a space that's actually authorized. Without
        // this, peer2 can't fetch and subduction logs `peer not authorized
        // to access sedimentree` (noise, not the bug under test).
        setup.bindDocToSpace(root.documentId, spaceKey);
      }
      waveTimings.push(performance.now() - t0);
    }

    const table = formatDiagnosticTable('spaces', { flushes: waveTimings, docsPerWave: SPACES_PER_WAVE });
    // eslint-disable-next-line no-console
    console.log(table);

    const ratio = waveTimings[WAVES - 1] / waveTimings[0];
    expect(
      ratio,
      `per-space creation latency grew ${ratio.toFixed(2)}x from wave 0 to wave ${WAVES - 1}\n${table}`,
    ).toBeLessThan(GROWTH_RATIO_THRESHOLD);
  });
});

/**
 * Spin up two `EchoHost`s with `useSubduction: true`, connect them via
 * `MeshEchoReplicator` over an in-memory teleport connection.
 *
 * The doc → space mapping is held in a shared `documentToSpace` map and wired
 * into both peers' `getSpaceKeyByRootDocumentId`. Tests call
 * `bindDocToSpace(documentId, spaceKey)` after `createSpaceRoot` to register
 * each space root, or `setFallbackSpace(spaceKey)` for a coarse single-space
 * mode where every unmapped doc routes to one pre-authorized space. Either
 * way, subduction's policy can then resolve each doc to a space the device
 * pair was authorized for via `authorizeSpace`.
 */
const setupConnectedPeers = async (builder: EchoTestBuilder) => {
  const teleportBuilder = new TeleportBuilder();
  onTestFinished(() => teleportBuilder.destroy());

  const documentToSpace = new Map<string, PublicKey>();
  let fallbackSpace: PublicKey | undefined;
  const lookup = (documentId: string) => documentToSpace.get(documentId) ?? fallbackSpace;

  const peer1 = await builder.createPeer({ useSubduction: true, getSpaceKeyByRootDocumentId: lookup });
  const peer2 = await builder.createPeer({ useSubduction: true, getSpaceKeyByRootDocumentId: lookup });

  const replicator1 = new MeshEchoReplicator();
  const replicator2 = new MeshEchoReplicator();
  await peer1.host.addReplicator(Context.default(), replicator1);
  await peer2.host.addReplicator(Context.default(), replicator2);

  const [tp1, tp2] = teleportBuilder.createPeers({ factory: () => new TeleportPeer() });
  const [connection1, connection2] = await teleportBuilder.connect(tp1, tp2);
  connection1.teleport.addExtension('automerge', replicator1.createExtension());
  connection2.teleport.addExtension('automerge', replicator2.createExtension());

  return {
    peer1,
    peer2,
    replicator1,
    replicator2,
    tp1,
    tp2,
    bindDocToSpace: (documentId: string, spaceKey: PublicKey) => documentToSpace.set(documentId, spaceKey),
    setFallbackSpace: (spaceKey: PublicKey) => {
      fallbackSpace = spaceKey;
    },
  };
};

/**
 * Authorize a fresh space key on both `MeshEchoReplicator`s so peer1 and peer2
 * can advertise/fetch docs that route to it. Mirrors the production
 * `MeshReplicator.authorizeDevice(spaceKey, deviceKey)` calls made on a
 * successful invitation.
 */
const authorizeSpace = async (
  replicator1: MeshEchoReplicator,
  replicator2: MeshEchoReplicator,
  tp1: TeleportPeer,
  tp2: TeleportPeer,
): Promise<PublicKey> => {
  const spaceKey = PublicKey.random();
  await replicator1.authorizeDevice(spaceKey, tp2.peerId);
  await replicator2.authorizeDevice(spaceKey, tp1.peerId);
  return spaceKey;
};

const formatDiagnosticTable = (
  label: string,
  { flushes, docsPerWave }: { flushes: number[]; docsPerWave: number },
): string => {
  const lines: string[] = [];
  lines.push(`\n[${label}] per-wave latency`);
  lines.push('wave | items | wave ms  | per-item ms');
  lines.push('-----+-------+----------+------------');
  for (const w of range(flushes.length)) {
    const ms = flushes[w];
    lines.push(
      `${String(w).padStart(4)} | ${String(docsPerWave).padStart(5)} | ${ms.toFixed(1).padStart(8)} | ${(ms / docsPerWave).toFixed(2).padStart(10)}`,
    );
  }
  return lines.join('\n');
};
