//
// Copyright 2026 DXOS.org
//

import { Schema } from 'effect';
import { FastCheck } from 'effect/testing';
import fs from 'node:fs';
import path from 'node:path';

import { log } from '@dxos/log';

import { type SchedulerEnvImpl } from '../../env';
import { type ReplicantBrain, type ReplicantsSummary, type TestPlan, type TestProps } from '../../plan';
import { ClientReplicant } from '../../replicants/client-replicant';
import { makeCommandSchema, toAsyncCommand } from './commands';
import { type Model, makeModel } from './model';
import {
  type EdgeStressResult,
  type EdgeStressSpec,
  type Real,
  BudgetExhausted,
  assertFullyReplicated,
  cleanupRun,
} from './system';

/**
 * Randomized stress test of a fleet of real clients replicating through EDGE.
 *
 * The orchestrator owns the model and every decision; replicants only execute. See
 * `.agents/projects/blade-runner-edge-stress/DESIGN.md` for the model, the operation vocabulary
 * and the assertions this implements.
 */
export class EdgeStress implements TestPlan<EdgeStressSpec, EdgeStressResult> {
  defaultSpec(): EdgeStressSpec {
    return {
      platform: 'nodejs',
      edgeUrl: 'http://localhost:8787',
      // Small by default so a local run finishes in minutes; the nightly spec scales this up.
      devicesPerIdentity: [2, 1],
      agents: false,
      maxSpaces: 2,
      maxDocumentsPerSpace: 4,
      maxCommands: 25,
      sampleDraws: 12,
      maxRuntimeMs: 10 * 60_000,
      quiescenceTimeoutMs: 60_000,
      checkpoints: true,
      cleanup: true,
    };
  }

  async run(env: SchedulerEnvImpl<EdgeStressSpec>, params: TestProps<EdgeStressSpec>): Promise<EdgeStressResult> {
    const spec = params.spec;
    const clientCount = spec.devicesPerIdentity.reduce((sum, count) => sum + count, 0);
    const tracePath = path.join(params.outDir, 'command-trace.jsonl');
    const traceStream = fs.createWriteStream(tracePath, { flags: 'a' });
    const trace = (entry: Record<string, unknown>) => {
      traceStream.write(`${JSON.stringify(entry)}\n`);
    };

    log.info('edge-stress starting', { seed: params.randomSeed, clientCount, spec });
    trace({ event: 'run', seed: params.randomSeed, spec });

    const setupBegin = Date.now();
    const { replicants, model, identityDids } = await this._setupFleet(env, params, clientCount);
    const setupTimeMs = Date.now() - setupBegin;
    log.info('fleet ready', { setupTimeMs });

    const real: Real = {
      spec,
      replicants,
      deadline: Number.MAX_SAFE_INTEGER,
      spaceIds: [],
      invitationCodes: [],
      identityDids,
      trace,
      counters: { commands: 0, documents: 0 },
    };

    const commandSchema = makeCommandSchema({
      clients: clientCount,
      spaces: spec.maxSpaces,
      documents: spec.maxDocumentsPerSpace,
    });
    const commands = Schema.toArbitrary(commandSchema)(FastCheck)
      .filter((command) => command._tag !== 'Checkpoint' || spec.checkpoints)
      .map(toAsyncCommand);

    const runBegin = Date.now();
    real.deadline = runBegin + spec.maxRuntimeMs;

    // Draw every candidate sequence from the seed and execute the longest.
    const draws = FastCheck.sample(FastCheck.commands([commands], { maxCommands: spec.maxCommands, size: 'large' }), {
      seed: hashSeed(params.randomSeed ?? ''),
      numRuns: spec.sampleDraws,
    });
    const generated = draws.reduce((longest, candidate) =>
      [...candidate].length > [...longest].length ? candidate : longest,
    );
    // Recorded before execution so the seed's sequence is provable independently of how far the
    // run gets: same seed, same `plan` line.
    const planned = [...generated].map((command) => command.toString());
    trace({ event: 'plan', seed: params.randomSeed, commands: planned });
    log.info('command sequence drawn', {
      draws: draws.length,
      lengths: draws.map((candidate) => [...candidate].length),
      chosen: planned.length,
    });

    try {
      try {
        await FastCheck.asyncModelRun(() => ({ model, real }), generated);
      } catch (err) {
        if (!(err instanceof BudgetExhausted)) {
          throw err;
        }
        log.warn('time budget exhausted; proceeding to the final assertion', { spent: Date.now() - runBegin });
      }
      await assertFullyReplicated(model, real);
    } finally {
      trace({ event: 'done', commands: real.counters.commands });
      // Runs even when an assertion threw, which is exactly when a shared environment would leak.
      const adminKey = process.env.DX_HUB_API_KEY;
      if (spec.cleanup && adminKey) {
        await cleanupRun(real, adminKey);
      } else if (spec.cleanup) {
        log.warn('cleanup skipped: DX_HUB_API_KEY is not set', {
          spaces: real.spaceIds.length,
          identities: real.identityDids.length,
        });
      }
      traceStream.end();
    }

    return {
      seed: params.randomSeed,
      commandsExecuted: real.counters.commands,
      spacesCreated: real.spaceIds.length,
      documentsCreated: real.counters.documents,
      setupTimeMs,
      runTimeMs: Date.now() - runBegin,
    };
  }

  /**
   * Spawn every replicant, mint one identity per group and admit its extra devices, so the fleet
   * mixes HALO device replication with invitation-through-EDGE (decision D1).
   */
  private async _setupFleet(
    env: SchedulerEnvImpl<EdgeStressSpec>,
    params: TestProps<EdgeStressSpec>,
    clientCount: number,
  ): Promise<{ replicants: ReplicantBrain<ClientReplicant>[]; model: Model; identityDids: string[] }> {
    const spec = params.spec;

    const replicants: ReplicantBrain<ClientReplicant>[] = [];
    for (let index = 0; index < clientCount; index++) {
      const replicant = await env.spawn(ClientReplicant, { platform: spec.platform });
      await replicant.brain.init({ edgeUrl: spec.edgeUrl, agents: spec.agents });
      replicants.push(replicant);
    }

    const model = makeModel({
      maxSpaces: spec.maxSpaces,
      maxDocumentsPerSpace: spec.maxDocumentsPerSpace,
      agents: spec.agents,
    });

    const identityDids: string[] = [];
    let cursor = 0;
    for (const [identity, devices] of spec.devicesPerIdentity.entries()) {
      const owner = cursor;
      const { identityDid } = await replicants[owner].brain.createIdentity({
        displayName: `edge-stress-identity-${identity}`,
      });
      identityDids.push(identityDid);
      if (spec.agents) {
        await replicants[owner].brain.createAgent();
      }
      model.identities.push({ devices: [] });

      for (let device = 0; device < devices; device++) {
        const client = cursor++;
        if (device > 0) {
          const { invitationCode } = await replicants[owner].brain.inviteDevice();
          await replicants[client].brain.joinAsDevice({ invitationCode });
        }
        model.clients.push({ identity, state: 'online' });
        model.identities[identity].devices.push(client);
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
