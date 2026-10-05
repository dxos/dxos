//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type SchedulerEnvImpl } from '../../env/index.ts';
import {
  type Platform,
  type ReplicantBrain,
  type ReplicantsSummary,
  type TestPlan,
  type TestProps,
  onCleanupSignal,
} from '../../plan/index.ts';
import { ClientReplicant, type SpaceDigest } from '../../replicants/client-replicant.ts';
import { describeError } from '../../util.ts';
import { type EdgeTarget, assertCanCleanUp, canonical, isDevLikeTarget, token, urlsFor } from '../edge-stress/index.ts';

//
// Spec.
//

export type EdgeSeededSpaceSpec = {
  platform: Platform;
  edge: EdgeTarget;
  /** Identities working on the seeded space, one device each; the first imports or creates it. */
  identities: number;
  agents: boolean;
  /**
   * Bind each identity to a Hub account through the test-email hatch on dev-like targets — required
   * there for agents and for the self-serve cleanup. Off only for a stack without the hatch (the
   * in-process test harness), where agents are hosted without an account.
   */
  bindAccounts: boolean;
  /**
   * Space archive (`space.internal.export()` output) to seed EDGE with — a real space's contents.
   * Without one, the seeder writes {@link syntheticDocuments} documents of {@link syntheticContentBytes}.
   */
  archivePath?: string;
  syntheticDocuments: number;
  syntheticContentBytes: number;
  /** Rounds of concurrent edits after every identity has joined. */
  rounds: number;
  /** Text edits each identity makes to its own probe document per round. */
  editsPerRound: number;
  /** Documents each identity creates per round, so new trees keep arriving at EDGE. */
  newDocumentsPerRound: number;
  /** Ceiling on a round: from its first edit until every identity holds every edit of it. */
  roundBudgetMs: number;
  /** Ceiling on one edit: from the edit flushing locally until every other identity holds it. */
  editBudgetMs: number;
  /** Ceiling on a joiner pulling the whole seeded space after admission. */
  joinBudgetMs: number;
  /** Ceiling on importing or writing the seed and uploading it to EDGE; the run is void past it. */
  seedTimeoutMs: number;
  cleanup: boolean;
};

export const DEFAULT_SPEC: EdgeSeededSpaceSpec = {
  platform: 'nodejs',
  edge: 'local',
  identities: 5,
  agents: true,
  bindAccounts: true,
  syntheticDocuments: 2_000,
  syntheticContentBytes: 2_000,
  rounds: 10,
  editsPerRound: 2,
  newDocumentsPerRound: 1,
  roundBudgetMs: 30_000,
  editBudgetMs: 10_000,
  joinBudgetMs: 30_000,
  seedTimeoutMs: 20 * 60_000,
  cleanup: true,
};

export const resolveSpec = (overrides: Partial<EdgeSeededSpaceSpec> = {}): EdgeSeededSpaceSpec => ({
  ...DEFAULT_SPEC,
  ...overrides,
});

export type JoinMeasurement = {
  joiner: number;
  admittedMs?: number;
  spaceReadyMs?: number;
  /** Pulling the whole space from EDGE once admitted. */
  pullMs?: number;
  ok: boolean;
  error?: string;
};

export type RoundMeasurement = {
  round: number;
  /** First edit to every identity holding every edit of the round. */
  roundMs?: number;
  /** Per edit: flushed locally to held by every other identity. */
  editLatenciesMs: number[];
  ok: boolean;
  error?: string;
};

export type EdgeSeededSpaceResult = {
  ok: boolean;
  edge: string;
  seed: string;
  seedMs: number;
  uploadMs: number;
  joins: JoinMeasurement[];
  rounds: RoundMeasurement[];
  maxRoundMs?: number;
  p95EditMs?: number;
  maxEditMs?: number;
  violations: string[];
};

const POLL_INTERVAL_MS = 250;
const PROBE_PREFIX = 'probe-';
const probeId = (client: number) => `${PROBE_PREFIX}c${client}`;
const roundDocumentId = (round: number, client: number, index: number) =>
  `${PROBE_PREFIX}r${round}-c${client}-${index}`;

/**
 * A large, real space under sustained multi-identity work through EDGE.
 *
 * The stress plan draws many small spaces; production failures came from one big one — thousands of
 * documents, several identities active at once, every instance recycle forcing them all to resync.
 * This plan reproduces that shape: identity 0 seeds EDGE with a space (an imported archive or a
 * synthetic one of the same size), the others join it, and every identity then edits concurrently
 * in rounds, each round and each edit held to a latency budget.
 */
export class EdgeSeededSpace implements TestPlan<EdgeSeededSpaceSpec, EdgeSeededSpaceResult> {
  defaultSpec(): EdgeSeededSpaceSpec {
    return DEFAULT_SPEC;
  }

  async run(
    env: SchedulerEnvImpl<EdgeSeededSpaceSpec>,
    params: TestProps<EdgeSeededSpaceSpec>,
  ): Promise<EdgeSeededSpaceResult> {
    const spec = resolveSpec(params.spec);
    invariant(spec.identities >= 2, 'need a seeder and at least one joiner');
    const { edgeUrl, hubUrl } = urlsFor(spec.edge);
    assertCanCleanUp(spec.edge, spec.cleanup);
    log.info('edge-seeded-space starting', { edgeUrl, spec });

    const clients: ReplicantBrain<ClientReplicant>[] = [];
    const identityDids: string[] = [];
    const joins: JoinMeasurement[] = [];
    const rounds: RoundMeasurement[] = [];
    let spaceId: string | undefined;
    let seedMs = 0;
    let uploadMs = 0;
    const seed = spec.archivePath
      ? `archive ${path.basename(spec.archivePath)}`
      : `${spec.syntheticDocuments} synthetic documents`;

    const unregisterCleanup = onCleanupSignal(async () => {
      if (spec.cleanup) {
        await this._cleanup(edgeUrl, clients, spaceId, identityDids);
      }
    });

    try {
      for (let index = 0; index < spec.identities; index++) {
        clients.push(await this._spawn(env, spec, { edgeUrl, hubUrl }, index, identityDids));
      }
      const [seeder, ...joiners] = clients;

      // Seed.
      const seedBegan = Date.now();
      if (spec.archivePath) {
        spaceId = (await seeder.brain.importSpace({ archivePath: spec.archivePath })).spaceId;
      } else {
        spaceId = (await seeder.brain.createSpace({ label: 'seeded-space' })).spaceId;
        await seeder.brain.createSeedDocuments({
          spaceId,
          count: spec.syntheticDocuments,
          contentBytes: spec.syntheticContentBytes,
        });
      }
      const space = spaceId;
      for (let client = 0; client < spec.identities; client++) {
        await seeder.brain.createDocument({ spaceId: space, docId: probeId(client), counterSlots: 0 });
      }
      seedMs = Date.now() - seedBegan;
      const upload = await seeder.brain.syncToEdge({ spaceId: space, timeoutMs: spec.seedTimeoutMs });
      uploadMs = upload.syncMs;
      log.info('space seeded and uploaded to edge', { seed, seedMs, uploadMs, documents: upload.localDocumentCount });

      // The model: tokens per probe document, and the documents every identity must hold.
      const expected = new Map<string, Set<string>>();
      for (let client = 0; client < spec.identities; client++) {
        expected.set(probeId(client), new Set());
      }

      // Joins, one at a time so each pull is measured on its own.
      for (const [offset, joiner] of joiners.entries()) {
        const measurement: JoinMeasurement = { joiner: offset + 1, ok: false };
        try {
          const { invitationCode } = await seeder.brain.shareSpace({ spaceId: space });
          const joined = await joiner.brain.joinSpace({ invitationCode });
          measurement.admittedMs = joined.admittedMs;
          measurement.spaceReadyMs = joined.spaceReadyMs;
          const pull = await joiner.brain.syncToEdge({ spaceId: space, timeoutMs: spec.seedTimeoutMs });
          measurement.pullMs = pull.syncMs;
          measurement.ok = true;
        } catch (err) {
          measurement.error = describeError(err);
        }
        joins.push(measurement);
        log.info('joiner measured', { ...measurement });
      }
      invariant(
        joins.every((join) => join.ok),
        `joins failed: ${joins
          .filter((join) => !join.ok)
          .map((join) => `${join.joiner}: ${join.error}`)
          .join('; ')}`,
      );

      // Rounds.
      const seq = new Array<number>(spec.identities).fill(0);
      for (let round = 0; round < spec.rounds; round++) {
        rounds.push(await this._runRound(spec, clients, space, expected, seq, round));
        log.info('round measured', { ...rounds[rounds.length - 1] });
      }

      const result = this._summarize(edgeUrl, spec, seed, seedMs, uploadMs, joins, rounds);
      invariant(result.ok, `budget violations: ${result.violations.join('; ')}`);
      return result;
    } finally {
      try {
        const summary = this._summarize(edgeUrl, spec, seed, seedMs, uploadMs, joins, rounds);
        fs.writeFileSync(path.join(params.outDir, 'seeded-space.json'), `${JSON.stringify(summary, null, 2)}\n`);
        fs.writeFileSync(path.join(params.outDir, 'summary.md'), renderSummary(summary, spec));
      } finally {
        unregisterCleanup();
        if (spec.cleanup) {
          await this._cleanup(edgeUrl, clients, spaceId, identityDids);
        }
      }
    }
  }

  /**
   * One round: every identity edits its own probe document and creates new documents concurrently,
   * then every identity is polled until it holds all of it. An edit's latency is from its own flush
   * to the last other identity holding it, so it is measured per edit rather than per round.
   */
  private async _runRound(
    spec: EdgeSeededSpaceSpec,
    clients: ReplicantBrain<ClientReplicant>[],
    spaceId: string,
    expected: Map<string, Set<string>>,
    seq: number[],
    round: number,
  ): Promise<RoundMeasurement> {
    const began = Date.now();
    const edits: { token: string; author: number; flushedAt: number; heldAt: Map<number, number> }[] = [];
    try {
      await Promise.all(
        clients.map(async (client, author) => {
          const probeTokens = expected.get(probeId(author));
          invariant(probeTokens, `no probe document for identity ${author}`);
          for (let index = 0; index < spec.newDocumentsPerRound; index++) {
            const docId = roundDocumentId(round, author, index);
            await client.brain.createDocument({ spaceId, docId, counterSlots: 0 });
            expected.set(docId, new Set());
          }
          for (let index = 0; index < spec.editsPerRound; index++) {
            const editToken = token(author, seq[author]++);
            await client.brain.editDocumentText({
              spaceId,
              docId: probeId(author),
              token: editToken,
              positionRatio: Math.random(),
            });
            probeTokens.add(editToken);
            edits.push({ token: editToken, author, flushedAt: Date.now(), heldAt: new Map([[author, Date.now()]]) });
          }
        }),
      );

      const expectedCanonical = canonical(expectedDigest(expected));
      const converged = new Set<number>();
      const hardDeadline = began + Math.max(spec.roundBudgetMs * 4, 120_000);
      while (converged.size < clients.length) {
        if (Date.now() > hardDeadline) {
          throw new Error(
            `round did not converge in ${Date.now() - began}ms; identities behind: ${clients
              .map((_, index) => index)
              .filter((index) => !converged.has(index))
              .join(', ')}`,
          );
        }
        await Promise.all(
          clients.map(async (client, index) => {
            if (converged.has(index)) {
              return;
            }
            const digest = await client.brain.digest({ spaceId, docIdPrefix: PROBE_PREFIX });
            const now = Date.now();
            const held = new Set(Object.values(digest.docs).flatMap((doc) => doc.tokens));
            for (const edit of edits) {
              if (!edit.heldAt.has(index) && held.has(edit.token)) {
                edit.heldAt.set(index, now);
              }
            }
            if (canonical(digest) === expectedCanonical) {
              converged.add(index);
            }
          }),
        );
        if (converged.size < clients.length) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
      }
      const roundMs = Date.now() - began;
      const editLatenciesMs = edits.map((edit) => Math.max(...edit.heldAt.values()) - edit.flushedAt);
      return { round, roundMs, editLatenciesMs, ok: true };
    } catch (err) {
      return { round, editLatenciesMs: [], ok: false, error: describeError(err) };
    }
  }

  private async _spawn(
    env: SchedulerEnvImpl<EdgeSeededSpaceSpec>,
    spec: EdgeSeededSpaceSpec,
    { edgeUrl, hubUrl }: { edgeUrl: string; hubUrl: string },
    index: number,
    identityDids: string[],
  ): Promise<ReplicantBrain<ClientReplicant>> {
    const replicant = await env.spawn(ClientReplicant, { platform: spec.platform });
    await replicant.brain.init({ edgeUrl, agents: spec.agents, partitions: false });
    const { identityDid } = await replicant.brain.createIdentity({ displayName: `seeded-space-${index}` });
    identityDids.push(identityDid);
    // One fixed alias per slot rebinds rather than accumulating account rows; required for the
    // self-serve cleanup routes and for EDGE to host an agent.
    if (spec.bindAccounts && isDevLikeTarget(spec.edge)) {
      await replicant.brain.bindTestAccount({ hubUrl, email: `test+bladerunner-seeded-${index}@dxos.org` });
    }
    if (spec.agents) {
      await replicant.brain.createAgent();
    }
    return replicant;
  }

  private _summarize(
    edgeUrl: string,
    spec: EdgeSeededSpaceSpec,
    seed: string,
    seedMs: number,
    uploadMs: number,
    joins: JoinMeasurement[],
    rounds: RoundMeasurement[],
  ): EdgeSeededSpaceResult {
    const violations: string[] = [];
    for (const join of joins) {
      if (!join.ok) {
        violations.push(`joiner ${join.joiner} failed: ${join.error}`);
      } else if ((join.pullMs ?? 0) > spec.joinBudgetMs) {
        violations.push(`joiner ${join.joiner} pulled in ${join.pullMs}ms > ${spec.joinBudgetMs}ms`);
      }
    }
    for (const round of rounds) {
      if (!round.ok) {
        violations.push(`round ${round.round} failed: ${round.error}`);
        continue;
      }
      if ((round.roundMs ?? 0) > spec.roundBudgetMs) {
        violations.push(`round ${round.round} took ${round.roundMs}ms > ${spec.roundBudgetMs}ms`);
      }
      const slow = round.editLatenciesMs.filter((latency) => latency > spec.editBudgetMs);
      if (slow.length > 0) {
        violations.push(
          `round ${round.round}: ${slow.length} edits over ${spec.editBudgetMs}ms (max ${Math.max(...slow)}ms)`,
        );
      }
    }
    if (joins.length + 1 < spec.identities) {
      violations.push(`only ${joins.length} of ${spec.identities - 1} joiners ran`);
    }
    if (rounds.length < spec.rounds) {
      violations.push(`only ${rounds.length} of ${spec.rounds} rounds ran`);
    }
    const edits = rounds.flatMap((round) => round.editLatenciesMs).sort((left, right) => left - right);
    const roundTimes = rounds.flatMap((round) => (round.roundMs === undefined ? [] : [round.roundMs]));
    return {
      ok: violations.length === 0,
      edge: edgeUrl,
      seed,
      seedMs,
      uploadMs,
      joins,
      rounds,
      maxRoundMs: roundTimes.length > 0 ? Math.max(...roundTimes) : undefined,
      p95EditMs: edits.length > 0 ? edits[Math.min(edits.length - 1, Math.floor(edits.length * 0.95))] : undefined,
      maxEditMs: edits.length > 0 ? edits[edits.length - 1] : undefined,
      violations,
    };
  }

  /** Every identity deletes itself; the seeder also deletes the space. Never throws. */
  private async _cleanup(
    edgeUrl: string,
    clients: ReplicantBrain<ClientReplicant>[],
    spaceId: string | undefined,
    identityDids: string[],
  ): Promise<void> {
    const refused: string[] = [];
    for (const [index, client] of clients.entries()) {
      try {
        const result = await client.brain.deleteOwnData({ spaceIds: index === 0 && spaceId ? [spaceId] : [] });
        refused.push(...result.refused);
      } catch (err) {
        log.warn('cleanup threw', { index, err });
        refused.push(identityDids[index] ?? `replicant-${index}`);
      }
    }
    if (refused.length > 0) {
      log.error('cleanup left data behind', { edgeUrl, ids: refused });
    }
  }

  async analyze(
    params: TestProps<EdgeSeededSpaceSpec>,
    summary: ReplicantsSummary,
    result: EdgeSeededSpaceResult,
  ): Promise<EdgeSeededSpaceResult> {
    log.info('edge-seeded-space result', { result });
    return result;
  }
}

const expectedDigest = (expected: Map<string, Set<string>>): SpaceDigest => ({
  docs: Object.fromEntries(
    [...expected.entries()].map(([docId, tokens]) => [
      docId,
      { tokens: [...tokens].sort(), counters: [], content: '' },
    ]),
  ),
});

const renderSummary = (result: EdgeSeededSpaceResult, spec: EdgeSeededSpaceSpec): string => {
  const seconds = (value: number | undefined) => (value === undefined ? '—' : `${(value / 1000).toFixed(1)}s`);
  return [
    `## ${result.ok ? '✅' : '❌'} Seeded space — ${spec.identities} identities, ${result.seed}`,
    '',
    `Against \`${result.edge}\`. Seeded in ${seconds(result.seedMs)}, uploaded to EDGE in ${seconds(result.uploadMs)}.`,
    '',
    `Budgets: round ${seconds(spec.roundBudgetMs)}, edit ${seconds(spec.editBudgetMs)}, join pull ${seconds(spec.joinBudgetMs)}.`,
    `Slowest round ${seconds(result.maxRoundMs)}; edit p95 ${seconds(result.p95EditMs)}, max ${seconds(result.maxEditMs)}.`,
    '',
    '| Joiner | | Admitted | Space ready | Pull | Error |',
    '| --- | --- | --- | --- | --- | --- |',
    ...result.joins.map(
      (join) =>
        `| ${join.joiner} | ${join.ok ? '✅' : '❌'} | ${seconds(join.admittedMs)} | ${seconds(join.spaceReadyMs)} | ${seconds(join.pullMs)} | ${join.error ?? ''} |`,
    ),
    '',
    '| Round | | Round | Slowest edit | Error |',
    '| --- | --- | --- | --- | --- |',
    ...result.rounds.map(
      (round) =>
        `| ${round.round} | ${round.ok ? '✅' : '❌'} | ${seconds(round.roundMs)} | ${seconds(
          round.editLatenciesMs.length > 0 ? Math.max(...round.editLatenciesMs) : undefined,
        )} | ${round.error ?? ''} |`,
    ),
    '',
    ...(result.violations.length > 0
      ? ['### Violations', '', ...result.violations.map((line) => `- ${line}`), '']
      : []),
  ].join('\n');
};
