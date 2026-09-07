//
// Copyright 2026 DXOS.org
//

import { Schema } from 'effect';
import { FastCheck } from 'effect/testing';
import fs from 'node:fs';
import path from 'node:path';

import { EDGE_URLS } from '@dxos/config';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type SchedulerEnvImpl } from '../../env';
import { type ReplicantBrain, type ReplicantsSummary, type TestPlan, type TestProps } from '../../plan';
import { ClientReplicant } from '../../replicants/client-replicant';
import { Command, canRun, describe, execute, makeCommandArbitrary, mutatesData, simulate } from './commands';
import { type Model, makeFleetModel } from './model';
import {
  type EdgeStressResult,
  type EdgeStressSpec,
  type EdgeTarget,
  type Real,
  BudgetExhausted,
  assertFullyReplicated,
  cleanupRun,
} from './system';

/**
 * How many commands to draw per executable one.
 *
 * A uniformly drawn command is usually unreachable where it lands — `JoinSpace` before any space
 * exists, `EditText` before any document does — so a pool of this size is what lets the filtered
 * sequence still reach `maxCommands`.
 */
const COMMAND_POOL_FACTOR = 8;

/**
 * The one place a spec is written down; every run starts here and overrides what it changes.
 *
 * `readYAMLSpecFile` replaces the spec wholesale rather than merging it over the defaults, so
 * without this each variant of the run needed its own copy of every field — which is how a single
 * plan came to have six config files that then drifted apart.
 */
export const defaultsFor = (edge: EdgeTarget): EdgeStressSpec => ({
  platform: 'nodejs',
  edge,
  // Small by default so a local run finishes in minutes; a nightly run scales this up.
  devicesPerIdentity: [2, 1],
  agents: false,
  maxSpaces: 2,
  maxDocumentsPerSpace: 4,
  maxCommands: 25,
  sampleDraws: 12,
  // Every wait is longer against dev, where each operation crosses the public internet.
  maxRuntimeMs: edge === 'dev' ? 15 * 60_000 : 10 * 60_000,
  quiescenceTimeoutMs: edge === 'dev' ? 90_000 : 60_000,
  checkpoints: true,
  // Off until finding 5 (a cut link crashes the peer) is fixed; see RESULTS.md.
  partitions: false,
  cleanup: true,
});

/**
 * `edge` is read before the merge, since it selects the defaults everything else lands on. The
 * empty default covers a spec file that sets nothing, which yields `undefined` rather than `{}`.
 */
export const resolveSpec = (overrides: Partial<EdgeStressSpec> = {}): EdgeStressSpec => ({
  ...defaultsFor(overrides?.edge ?? 'local'),
  ...overrides,
});

/**
 * Both endpoints of one EDGE deployment: the Hub is served under `/hub/` of the same origin, so a
 * spec names its target once and cannot point the two halves at different deployments.
 */
export const urlsFor = (edge: EdgeTarget): { edgeUrl: string; hubUrl: string } => {
  const edgeUrl = EDGE_URLS[edge];
  return { edgeUrl, hubUrl: `${edgeUrl}/hub/` };
};

/**
 * Randomized stress test of a fleet of real clients replicating through EDGE.
 *
 * The orchestrator owns the model and every decision; replicants only execute. See
 * `.agents/projects/blade-runner-edge-stress/DESIGN.md` for the model, the operation vocabulary
 * and the assertions this implements.
 */
export class EdgeStress implements TestPlan<EdgeStressSpec, EdgeStressResult> {
  defaultSpec(): EdgeStressSpec {
    return defaultsFor('local');
  }

  async run(env: SchedulerEnvImpl<EdgeStressSpec>, params: TestProps<EdgeStressSpec>): Promise<EdgeStressResult> {
    // A spec file and `--spec` both supply only the fields they change, so what arrives here is a
    // partial spec even though the harness types it whole.
    const spec = resolveSpec(params.spec);
    const { edgeUrl, hubUrl } = urlsFor(spec.edge);
    const limits: Model['limits'] = {
      maxSpaces: spec.maxSpaces,
      maxDocumentsPerSpace: spec.maxDocumentsPerSpace,
      agents: spec.agents,
    };
    const clientCount = spec.devicesPerIdentity.reduce((sum, count) => sum + count, 0);
    const tracePath = path.join(params.outDir, 'command-trace.jsonl');
    const traceStream = fs.createWriteStream(tracePath, { flags: 'a' });
    const trace = (entry: Record<string, unknown>) => {
      traceStream.write(`${JSON.stringify(entry)}\n`);
    };

    log.info('edge-stress starting', { seed: params.randomSeed, clientCount, edgeUrl, spec });
    trace({ event: 'run', seed: params.randomSeed, spec });

    // Decided before a single process exists: the fleet model is pure, so the sequence is a
    // function of the seed alone and the recorded plan is exactly what will run.
    const plan = this._drawPlan(spec, params.randomSeed, limits, clientCount);
    // Both forms: `commands` for a human reading the trace, `plan` to replay via `spec.plan`.
    trace({ event: 'plan', seed: params.randomSeed, commands: plan.map(describe), plan });

    const setupBegin = Date.now();
    const { replicants, model, identityDids } = await this._setupFleet(env, spec, { edgeUrl, hubUrl }, limits);
    const setupTimeMs = Date.now() - setupBegin;
    log.info('fleet ready', { setupTimeMs });
    // Same reason as the per-space `spaceId` detail: identities a dead run leaves behind must be
    // recoverable from the trace alone.
    trace({ event: 'fleet', identityDids });

    const real: Real = {
      spec,
      edgeUrl,
      replicants,
      deadline: Number.MAX_SAFE_INTEGER,
      spaceIds: [],
      invitationCodes: [],
      spaceOwners: [],
      identityDids,
      trace,
      counters: { commands: 0, documents: 0 },
    };

    const runBegin = Date.now();
    real.deadline = runBegin + spec.maxRuntimeMs;

    try {
      try {
        for (const command of plan) {
          // Simulation and execution start from the same model and apply the same transitions, so
          // a disagreement here is a defect in `advance`, not an unlucky draw — fail loudly rather
          // than silently skipping, which is what made earlier runs look longer than they were.
          invariant(canRun(command, model), `command unreachable at execution time: ${describe(command)}`);
          try {
            await execute(command, model, real);
          } catch (err) {
            if (err instanceof BudgetExhausted) {
              throw err;
            }
            // The trace records a command when it *starts*, so a bare error reads as the command
            // after the failing one — an off-by-one that has already produced a wrong diagnosis.
            // Recording the failure in the trace itself keeps later analysis of the artifact honest.
            trace({ event: 'failed', seq: real.counters.commands, command: describe(command) });
            // The cause goes into the message too: the log processor renders neither `cause` chains
            // nor nested stacks, and the underlying message is the diagnosis.
            const reason = err instanceof Error ? err.message : String(err);
            throw new Error(`command ${real.counters.commands} ${describe(command)} failed: ${reason}`, { cause: err });
          }
        }
      } catch (err) {
        if (!(err instanceof BudgetExhausted)) {
          throw err;
        }
        log.warn('time budget exhausted; proceeding to the final assertion', { spent: Date.now() - runBegin });
      }
      await assertFullyReplicated(model, real);
    } finally {
      trace({ event: 'done', planned: plan.length, commands: real.counters.commands });
      // Runs even when an assertion threw, which is exactly when a shared environment would leak.
      if (spec.cleanup) {
        await cleanupRun(model, real);
      }
      traceStream.end();
    }

    return {
      seed: params.randomSeed,
      commandsPlanned: plan.length,
      commandsExecuted: real.counters.commands,
      spacesCreated: real.spaceIds.length,
      documentsCreated: real.counters.documents,
      setupTimeMs,
      runTimeMs: Date.now() - runBegin,
    };
  }

  /**
   * The sequence this seed will run: sample several pools, simulate each, keep the one that
   * replicates the most.
   */
  private _drawPlan(
    spec: EdgeStressSpec,
    seed: string | undefined,
    limits: Model['limits'],
    clientCount: number,
  ): Command[] {
    if (spec.plan !== undefined) {
      const entries = typeof spec.plan === 'string' ? readPlanFile(spec.plan) : spec.plan;
      const plan = entries.map((entry) => Schema.decodeUnknownSync(Command)(entry));
      // Simulated against the same starting model the run will use, so an edited plan reports a
      // command that cannot run rather than being quietly truncated at execution time.
      const executable = simulate(plan, makeFleetModel({ devicesPerIdentity: spec.devicesPerIdentity, limits }));
      invariant(
        executable.length === plan.length,
        `plan is not executable from the initial state: ${plan.length - executable.length} of ${plan.length} commands cannot run`,
      );
      log.info('replaying a fixed plan', {
        source: typeof spec.plan === 'string' ? spec.plan : 'inline',
        commands: plan.length,
      });
      return plan;
    }

    const command = makeCommandArbitrary({
      clients: clientCount,
      spaces: spec.maxSpaces,
      documents: spec.maxDocumentsPerSpace,
      checkpoints: spec.checkpoints,
      partitions: spec.partitions,
    });
    const pool = FastCheck.array(command, {
      minLength: spec.maxCommands,
      maxLength: spec.maxCommands * COMMAND_POOL_FACTOR,
      size: 'max',
    });

    const draws = FastCheck.sample(pool, {
      seed: hashSeed(seed ?? ''),
      numRuns: spec.sampleDraws,
    });
    const candidates = draws.map((draw) =>
      simulate(draw, makeFleetModel({ devicesPerIdentity: spec.devicesPerIdentity, limits }), spec.maxCommands),
    );
    // Ranked by data operations, not length: filtering already fills every candidate to
    // `maxCommands`, so length no longer separates a run that replicates something from one that
    // only churns clients.
    const score = (candidate: Command[]) => candidate.filter(mutatesData).length;
    const chosen = candidates.reduce((best, candidate) => (score(candidate) > score(best) ? candidate : best));
    // A run that executes nothing reports success, which is the same vacuity that made "24 planned,
    // 3 executed" look like a passing test. Small `maxCommands` makes it reachable: every command
    // but `CreateSpace` needs a space, so a short pool can contain nothing runnable at all.
    invariant(
      chosen.length > 0,
      `no executable command drawn from ${spec.sampleDraws} pools; raise maxCommands or set plan`,
    );

    log.info('command sequence drawn', {
      draws: draws.length,
      drawn: draws.map((draw) => draw.length),
      executable: candidates.map((candidate) => candidate.length),
      dataOps: candidates.map(score),
      chosen: chosen.length,
    });
    return chosen;
  }

  /**
   * Spawn every replicant, mint one identity per group and admit its extra devices, so the fleet
   * mixes HALO device replication with invitation-through-EDGE (decision D1).
   *
   * The topology comes from the same `makeFleetModel` the plan was simulated against, so the fleet
   * cannot be shaped differently from what the plan assumed.
   */
  private async _setupFleet(
    env: SchedulerEnvImpl<EdgeStressSpec>,
    spec: EdgeStressSpec,
    urls: { edgeUrl: string; hubUrl: string },
    limits: Model['limits'],
  ): Promise<{ replicants: ReplicantBrain<ClientReplicant>[]; model: Model; identityDids: string[] }> {
    const model = makeFleetModel({ devicesPerIdentity: spec.devicesPerIdentity, limits });

    const replicants: ReplicantBrain<ClientReplicant>[] = [];
    for (let index = 0; index < model.clients.length; index++) {
      const replicant = await env.spawn(ClientReplicant, { platform: spec.platform });
      await replicant.brain.init({ edgeUrl: urls.edgeUrl, agents: spec.agents, partitions: spec.partitions });
      replicants.push(replicant);
    }

    const identityDids: string[] = [];
    for (const [identity, { devices }] of model.identities.entries()) {
      const [owner, ...rest] = devices;
      const { identityDid } = await replicants[owner].brain.createIdentity({
        displayName: `edge-stress-identity-${identity}`,
      });
      identityDids.push(identityDid);
      // Unconditional: the self-serve cleanup routes 403 an identity with no Hub account, so a run
      // that skipped this could only be cleaned up with an admin key. One fixed alias per identity
      // slot — the hatch rebinds, so every run reuses the same rows.
      await replicants[owner].brain.bindTestAccount({
        hubUrl: urls.hubUrl,
        email: `test+bladerunner-${identity}@dxos.org`,
      });
      if (spec.agents) {
        await replicants[owner].brain.createAgent();
      }
      for (const device of rest) {
        const { invitationCode } = await replicants[owner].brain.inviteDevice();
        await replicants[device].brain.joinAsDevice({ invitationCode });
      }
    }

    return { replicants, model, identityDids };
  }

  async analyze(
    params: TestProps<EdgeStressSpec>,
    summary: ReplicantsSummary,
    result: EdgeStressResult,
  ): Promise<EdgeStressResult> {
    log.info('edge-stress result', { result });
    return result;
  }
}

/**
 * The plan recorded in a trace file, or a bare JSON array of commands.
 *
 * Reading the *last* `plan` entry matters: a trace is opened with `flags: 'a'`, so a directory
 * reused across runs holds every plan it ever ran, and the last one is the one that failed.
 */
const readPlanFile = (planFile: string): unknown[] => {
  const contents = fs.readFileSync(planFile, 'utf8').trim();
  if (contents.startsWith('[')) {
    return JSON.parse(contents) as unknown[];
  }
  const plans = contents
    .split('\n')
    .map((line) => JSON.parse(line) as { event?: string; plan?: unknown[] })
    .filter((entry) => entry.event === 'plan' && Array.isArray(entry.plan));
  invariant(plans.length > 0, `no plan entry in ${planFile}`);
  const plan = plans[plans.length - 1].plan;
  invariant(plan, 'plan entry has no commands');
  return plan;
};

/**
 * fast-check seeds are numeric; the harness's seed is a hex string, so fold it into 32 bits. The
 * mapping is stable, which is all reproducibility needs.
 */
const hashSeed = (seed: string): number => {
  let hash = 0;
  for (const character of seed) {
    hash = (Math.imul(hash, 31) + character.charCodeAt(0)) | 0;
  }
  return hash;
};
