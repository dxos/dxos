//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type SchedulerEnvImpl } from '../../env';
import {
  type Platform,
  type ReplicantBrain,
  type ReplicantsSummary,
  type TestPlan,
  type TestProps,
  onCleanupSignal,
} from '../../plan';
import { ClientReplicant, type SpaceDigest } from '../../replicants/client-replicant';
import { describeError } from '../../util';
import { type EdgeTarget, assertCanCleanUp, canonical, isDevLikeTarget, urlsFor } from '../edge-stress';

//
// Spec.
//

export type EdgeJoinLatencySpec = {
  platform: Platform;
  edge: EdgeTarget;
  /** Objects the seeder writes before any joiner is admitted — the size of the space under test. */
  objects: number;
  /** Peers that accept an invitation, each an identity of its own, each timed independently. */
  joiners: number;
  /**
   * Give the seeder an EDGE agent.
   *
   * Required, not cosmetic: `shareSpace` opens a DELEGATED invitation, which EDGE redeems on behalf
   * of a member, and with no agent `EdgeInvitationHandler` answers `No agents in the space.` and
   * retries until the join fails. Exposed rather than hardcoded so the no-agent path stays testable.
   */
  agents: boolean;
  /**
   * Ceiling on one joiner's catch-up. Exceeding it fails that joiner rather than the run, so a
   * single stuck peer still yields timings for the rest.
   */
  joinTimeoutMs: number;
  /** Ceiling on the seeder's own upload before any joiner starts; the measurement is invalid without it. */
  seedTimeoutMs: number;
  /** Delete the space and identities the run created, through the self-serve routes. */
  cleanup: boolean;
};

export type JoinMeasurement = {
  joiner: number;
  /**
   * The invitation proper: `spaces.join` to `Invitation_State.SUCCESS`, i.e. the guest's
   * credentials replicated into the space's control feed. It does not include bringing the peer up
   * or opening the invitation, and it stops before the space itself is available — that is
   * replication, and it scales with the space rather than with the exchange.
   */
  admittedMs: number;
  /** Space available locally once admitted: the root document loading. Part of replication. */
  spaceReadyMs: number | undefined;
  /** `spaceReadyMs` plus catching up to holding every object. The replication half. */
  replicationMs: number | undefined;
  /** `admittedMs + replicationMs`, i.e. what a user waits from accepting an invitation. */
  syncedMs: number | undefined;
  objects: number;
  /** Replication cost per object; the number to watch as a space grows. */
  msPerObject: number | undefined;
  ok: boolean;
  error?: string;
};

export type EdgeJoinLatencyResult = {
  ok: boolean;
  edge: string;
  objects: number;
  joiners: number;
  /** Seeder's upload time — how long the space took to reach EDGE before anyone joined. */
  seedMs: number;
  measurements: JoinMeasurement[];
  /** Medians rather than means: one stuck joiner should not move the headline number. */
  medianAdmittedMs: number | undefined;
  medianSpaceReadyMs: number | undefined;
  medianReplicationMs: number | undefined;
  medianSyncedMs: number | undefined;
  maxSyncedMs: number | undefined;
  /**
   * Whether each successive joiner took longer than the last. Flat is the expected shape; a rising
   * one means joiners are contending — measured against a degraded local stack, never against dev.
   */
  monotonicGrowth: boolean;
  /**
   * Whether the seeder got its EDGE agent. Without one the DELEGATED invitation is admitted by the
   * seeder directly, which is slower — so latency is only comparable across runs where this matches.
   */
  agent: boolean;
};

export const DEFAULT_SPEC: EdgeJoinLatencySpec = {
  platform: 'nodejs',
  edge: 'local',
  objects: 100,
  joiners: 5,
  agents: true,
  joinTimeoutMs: 5 * 60_000,
  seedTimeoutMs: 10 * 60_000,
  cleanup: true,
};

export const resolveSpec = (overrides: Partial<EdgeJoinLatencySpec> = {}): EdgeJoinLatencySpec => ({
  ...DEFAULT_SPEC,
  ...overrides,
});

//
// The measurement.
//

const POLL_INTERVAL_MS = 250;

/**
 * Poll until `read` matches `expected`, or the budget runs out.
 *
 * Deliberately digest-based rather than `getSyncState`: sync state is unreliable between EDGE and
 * the client (inkandswitch/subduction#286), and a latency number derived from a signal that lies is
 * worse than no number at all.
 */
const awaitDigest = async (
  read: () => Promise<SpaceDigest>,
  expected: string,
  budgetMs: number,
): Promise<{ ok: boolean; elapsedMs: number; last: string }> => {
  const began = Date.now();
  const deadline = began + budgetMs;
  let last = '';
  for (;;) {
    last = canonical(await read());
    if (last === expected) {
      return { ok: true, elapsedMs: Date.now() - began, last };
    }
    if (Date.now() > deadline) {
      return { ok: false, elapsedMs: Date.now() - began, last };
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
};

/**
 * How long a peer takes to accept an invitation to an existing space and hold all of it.
 *
 * The stress plan cannot express this: its fleet is fixed before any command runs, and every
 * identity that is online when a space is created joins it immediately, so there is no late joiner
 * to time. Here the joiners are spawned only once the space exists and has reached EDGE.
 */
export class EdgeJoinLatency implements TestPlan<EdgeJoinLatencySpec, EdgeJoinLatencyResult> {
  defaultSpec(): EdgeJoinLatencySpec {
    return DEFAULT_SPEC;
  }

  async run(
    env: SchedulerEnvImpl<EdgeJoinLatencySpec>,
    params: TestProps<EdgeJoinLatencySpec>,
  ): Promise<EdgeJoinLatencyResult> {
    const spec = resolveSpec(params.spec);
    const { edgeUrl, hubUrl } = urlsFor(spec.edge);
    assertCanCleanUp(spec.edge, spec.cleanup);
    const resultPath = path.join(params.outDir, 'join-latency.json');
    log.info('edge-join-latency starting', { edgeUrl, spec });

    const spawned: ReplicantBrain<ClientReplicant>[] = [];
    const identityDids: string[] = [];
    const measurements: JoinMeasurement[] = [];
    let spaceId: string | undefined;
    let seedMs = 0;
    let agentCreated = false;

    const spawn = async (label: string, agent = false): Promise<ReplicantBrain<ClientReplicant>> => {
      const replicant = await env.spawn(ClientReplicant, { platform: spec.platform });
      // Never `partitions`: the offline proxy cannot front an `https:` endpoint, and nothing here
      // cuts a link anyway.
      await replicant.brain.init({ edgeUrl, agents: spec.agents, partitions: false });
      const { identityDid } = await replicant.brain.createIdentity({ displayName: label });
      identityDids.push(identityDid);
      // The self-serve cleanup routes 403 an identity with no Hub account; one fixed alias per slot
      // rebinds rather than accumulating rows. On preview the hatch is closed, so this is skipped
      // and `DX_HUB_API_KEY` is the only way the run's data gets deleted.
      if (isDevLikeTarget(spec.edge)) {
        await replicant.brain.bindTestAccount({ hubUrl, email: `test+bladerunner-join-${label}@dxos.org` });
      }
      if (agent && spec.agents) {
        try {
          await replicant.brain.createAgent();
          agentCreated = true;
        } catch (err) {
          // Best-effort, same reasoning as the soak plan: without an agent the DELEGATED invitation
          // has to be admitted by the seeder itself, which is online throughout, so the join is
          // slower rather than impossible. Recorded in the result because it changes what the
          // number means.
          log.error('agent unavailable; joins will be admitted by the seeder directly', { err });
        }
      }
      spawned.push(replicant);
      return replicant;
    };

    // Same reason as the soak plan: SIGTERM skips `finally`, and a killed run would otherwise leave
    // its space and every identity behind.
    const unregisterCleanup = onCleanupSignal(async () => {
      if (spec.cleanup) {
        await this._cleanup(edgeUrl, spawned, spaceId, identityDids);
      }
    });

    try {
      // The seeder hosts every invitation, so it is the one that needs the agent.
      const seeder = await spawn('seeder', true);
      const created = await seeder.brain.createSpace({ label: 'join-latency' });
      // Kept in a local as well: the outer binding is what `finally` cleans up, but only this one
      // is narrowed to a string for the closures below.
      const space = created.spaceId;
      spaceId = space;

      // One document per object: the unit a joiner has to fetch is a document, so this is the
      // dimension the latency actually scales with.
      const seedBegan = Date.now();
      for (let index = 0; index < spec.objects; index++) {
        await seeder.brain.createDocument({
          spaceId: space,
          docId: `obj-${index}`,
          counterSlots: 1,
        });
      }
      await seeder.brain.flush({ spaceId: space });
      const expected = canonical(await seeder.brain.digest({ spaceId: space }));
      seedMs = Date.now() - seedBegan;
      log.info('space seeded and flushed to edge', { objects: spec.objects, seedMs });
      invariant(seedMs < spec.seedTimeoutMs, `seeding took ${seedMs}ms, over the ${spec.seedTimeoutMs}ms budget`);

      // Joiners are timed independently and sequentially: run in parallel they would contend for
      // the same EDGE connection budget and measure each other rather than the system.
      for (let joiner = 0; joiner < spec.joiners; joiner++) {
        let admittedMs = 0;
        try {
          // Spawning and sharing are inside the try because they fail too — a local stack under
          // load 500s on `/db/spaces/:id/join` — and one joiner's failure must cost only its own
          // row, not every measurement taken so far. Neither is timed: bringing a peer up and
          // opening an invitation are the harness's cost, not the system's.
          const peer = await spawn(`joiner-${joiner}`);
          const { invitationCode } = await seeder.brain.shareSpace({ spaceId: space });
          const joined = await peer.brain.joinSpace({ invitationCode });
          admittedMs = joined.admittedMs;
          // `async`/`await` rather than returning the call: an RPC handle's return is itself a
          // promise, so passing it through unawaited types as `Promise<Promise<SpaceDigest>>`.
          const settled = await awaitDigest(
            async () => await peer.brain.digest({ spaceId: space }),
            expected,
            spec.joinTimeoutMs,
          );
          // The space loading locally is replication, not invitation, so it belongs on this side of
          // the split even though `joinSpace` is what waited for it.
          const replicationMs = settled.ok ? joined.spaceReadyMs + settled.elapsedMs : undefined;
          measurements.push({
            joiner,
            admittedMs,
            spaceReadyMs: joined.spaceReadyMs,
            replicationMs,
            syncedMs: replicationMs === undefined ? undefined : admittedMs + replicationMs,
            objects: spec.objects,
            msPerObject: replicationMs !== undefined && spec.objects > 0 ? replicationMs / spec.objects : undefined,
            ok: settled.ok,
            error: settled.ok ? undefined : `digest still differed after ${spec.joinTimeoutMs}ms`,
          });
        } catch (err) {
          measurements.push({
            joiner,
            admittedMs,
            spaceReadyMs: undefined,
            replicationMs: undefined,
            syncedMs: undefined,
            objects: spec.objects,
            msPerObject: undefined,
            ok: false,
            // Message alone is not enough from CI: `Invalid space id.` named neither the call that
            // threw nor the cause under it, and the replicant never logged it because the error
            // crossed the RPC boundary. The artifact has to carry what a local repro would show.
            error: describeError(err),
          });
        }
        log.info('joiner measured', { ...measurements[measurements.length - 1] });
      }

      const result = this._summarize(edgeUrl, spec, seedMs, measurements, agentCreated);
      invariant(
        result.ok,
        `joiners failed to sync: ${measurements
          .filter((measurement) => !measurement.ok)
          .map((measurement) => `${measurement.joiner} (${measurement.error})`)
          .join(', ')}`,
      );
      return result;
    } finally {
      // In `finally` so the artifacts exist however the run ended: a green/red verdict with no
      // numbers behind it is the one output a CI job must never produce.
      const summary = this._summarize(edgeUrl, spec, seedMs, measurements, agentCreated);
      fs.writeFileSync(resultPath, `${JSON.stringify(summary, null, 2)}\n`);
      fs.writeFileSync(path.join(params.outDir, 'summary.md'), renderSummary(summary));
      unregisterCleanup();
      if (spec.cleanup) {
        await this._cleanup(edgeUrl, spawned, spaceId, identityDids);
      }
    }
  }

  /** Shared by the success path and the `finally`, so both report the same shape. */
  private _summarize(
    edgeUrl: string,
    spec: EdgeJoinLatencySpec,
    seedMs: number,
    measurements: JoinMeasurement[],
    agent: boolean,
  ): EdgeJoinLatencyResult {
    const ok = measurements.filter((measurement) => measurement.ok);
    const median = (pick: (measurement: JoinMeasurement) => number | undefined): number | undefined => {
      const values = ok.flatMap((measurement) => {
        const value = pick(measurement);
        return value === undefined ? [] : [value];
      });
      values.sort((left, right) => left - right);
      return values.length > 0 ? values[Math.floor(values.length / 2)] : undefined;
    };
    const synced = ok.map((measurement) => measurement.syncedMs ?? 0);
    return {
      ok: measurements.length === spec.joiners && measurements.every((measurement) => measurement.ok),
      edge: edgeUrl,
      objects: spec.objects,
      joiners: spec.joiners,
      seedMs,
      measurements,
      medianAdmittedMs: median((measurement) => measurement.admittedMs),
      medianSpaceReadyMs: median((measurement) => measurement.spaceReadyMs),
      medianReplicationMs: median((measurement) => measurement.replicationMs),
      medianSyncedMs: median((measurement) => measurement.syncedMs),
      maxSyncedMs: synced.length > 0 ? Math.max(...synced) : undefined,
      // Compared in join order, not sorted: the question is whether each joiner paid more than the
      // one before it.
      monotonicGrowth: synced.length > 1 && synced.every((value, index) => index === 0 || value > synced[index - 1]),
      agent,
    };
  }

  /**
   * Every identity deletes itself; the seeder also deletes the space it owns. Nothing throws — a
   * cleanup failure must not mask the measurement.
   *
   * Self-serve only: the identity signs a verifiable presentation for exactly the data it created.
   * No admin-key fallback, deliberately — a shared secret that can delete anything is not something
   * a test should carry, and it would mask the case this cleanup exists to prove.
   */
  private async _cleanup(
    edgeUrl: string,
    spawned: ReplicantBrain<ClientReplicant>[],
    spaceId: string | undefined,
    identityDids: string[],
  ): Promise<void> {
    let accepted = 0;
    const refused: string[] = [];
    for (const [index, replicant] of spawned.entries()) {
      try {
        // Only the seeder (index 0) owns the space; a joiner deleting it would be refused.
        const result = await replicant.brain.deleteOwnData({ spaceIds: index === 0 && spaceId ? [spaceId] : [] });
        accepted += result.accepted.length;
        refused.push(...result.refused);
      } catch (err) {
        log.warn('cleanup threw', { index, err });
        refused.push(identityDids[index] ?? `replicant-${index}`);
      }
    }

    if (refused.length > 0) {
      // Loud: these are real rows left in a shared environment, and the trace is the only record.
      log.error('cleanup left data behind', { edgeUrl, ids: refused });
    }
    log.info('cleanup done', { accepted, refused });
  }

  async analyze(
    params: TestProps<EdgeJoinLatencySpec>,
    summary: ReplicantsSummary,
    result: EdgeJoinLatencyResult,
  ): Promise<EdgeJoinLatencyResult> {
    log.info('edge-join-latency result', { result });
    return result;
  }
}

/**
 * The run as a CI job summary. Written by the plan rather than by a workflow script so the same
 * table appears locally, and so nothing has to re-derive the verdict from the JSON.
 */
const renderSummary = (result: EdgeJoinLatencyResult): string => {
  const ms = (value: number | undefined) => (value === undefined ? '—' : `${(value / 1000).toFixed(1)}s`);
  const share = (part: number | undefined, whole: number | undefined) =>
    part === undefined || whole === undefined || whole === 0 ? '—' : `${Math.round((part / whole) * 100)}%`;
  // Derived rather than stored: the two halves of replication always sum to it, so a second field
  // would only be a way for them to disagree.
  const objectsMs = (measurement: JoinMeasurement) =>
    measurement.replicationMs === undefined || measurement.spaceReadyMs === undefined
      ? undefined
      : measurement.replicationMs - measurement.spaceReadyMs;
  const rows = result.measurements
    .map((measurement) =>
      [
        `| ${measurement.joiner}`,
        measurement.ok ? '✅' : '❌',
        ms(measurement.admittedMs),
        ms(measurement.spaceReadyMs),
        ms(objectsMs(measurement)),
        ms(measurement.syncedMs),
        measurement.msPerObject === undefined ? '—' : `${measurement.msPerObject.toFixed(0)}ms`,
        `${measurement.error ?? ''} |`,
      ].join(' | '),
    )
    .join('\n');
  return [
    `## ${result.ok ? '✅' : '❌'} Join latency — ${result.objects} objects, ${result.joiners} joiners`,
    '',
    `Against \`${result.edge}\`. Seeded and flushed to EDGE in ${ms(result.seedMs)}.${
      result.agent ? '' : ' ⚠️ No EDGE agent — the seeder admitted every joiner itself, which is slower.'
    }`,
    '',
    '| | Median | Share of total |',
    '| --- | --- | --- |',
    `| Invitation — credentials replicated | ${ms(result.medianAdmittedMs)} | ${share(result.medianAdmittedMs, result.medianSyncedMs)} |`,
    `| Replication | ${ms(result.medianReplicationMs)} | ${share(result.medianReplicationMs, result.medianSyncedMs)} |`,
    `| — of which, space available | ${ms(result.medianSpaceReadyMs)} | |`,
    `| **Accept to fully synced** | **${ms(result.medianSyncedMs)}** | |`,
    '',
    `Slowest joiner ${ms(result.maxSyncedMs)}.${
      result.monotonicGrowth
        ? ' ⚠️ Every joiner took longer than the one before it — joiners are contending, or the stack is degrading.'
        : ''
    }`,
    '',
    '| Joiner | | Invitation | Space ready | Objects | Total | Per object | Error |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    rows,
    '',
  ].join('\n');
};
