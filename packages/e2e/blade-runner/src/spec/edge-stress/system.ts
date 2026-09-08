//
// Copyright 2026 DXOS.org
//

import { asyncTimeout, sleep } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type Platform, type ReplicantBrain } from '../../plan';
import { type ClientReplicant, type SpaceDigest } from '../../replicants/client-replicant';
import {
  type ClientIndex,
  type IdentityIndex,
  type Model,
  canonical,
  expectedDigest,
  identityOf,
  onlineMemberDevices,
  resolvablePendingSpaces,
} from './model';

//
// Spec.
//

/**
 * Which EDGE to run against.
 *
 * All three carry the `test+*@dxos.org` hatch that binds a run's identities to Hub accounts, which
 * the self-serve delete routes require — preview since dxos/edge#1026, which gated the hatch on its
 * own `isTestAccountEnvironment` rather than on `isDevLikeEnvironment`. Staging and production do
 * not, and are absent here for that reason: a run there could not delete what it created.
 */
export type EdgeTarget = 'local' | 'dev' | 'preview';

/**
 * Where the test-email hatch is open, hence where a run can bind accounts and clean up after itself.
 *
 * Every target this type admits, so it is presently total — kept as a predicate rather than deleted
 * because it is the check that stops a run it cannot undo, and the next target added (staging, a
 * one-off deployment) is far more likely to lack the hatch than to have it.
 */
export const isDevLikeTarget = (edge: EdgeTarget): boolean => edge === 'local' || edge === 'dev' || edge === 'preview';

/**
 * Refuse to start a run that could not undo itself.
 *
 * Checked before a single identity exists, because the failure it prevents is silent: against a
 * target with no test-email hatch every self-serve delete is refused, and without an admin key the
 * spaces and identities simply stay in a shared environment with nothing but the trace recording
 * that they were ever created.
 */
export const assertCanCleanUp = (edge: EdgeTarget, cleanup: boolean): void => {
  invariant(
    !cleanup || isDevLikeTarget(edge),
    `${edge} has no test-email hatch, so an identity cannot bind a Hub account there and the self-serve delete routes answer 403; cleanup would leave every space and identity behind`,
  );
};

/**
 * Every field is optional at the call site and complete here: `defaultsFor` in `plan.ts` is the
 * only place a default is written down, and `resolveSpec` merges a spec file or `--spec` over it.
 * This declaration is therefore also the documentation of what a run can be told to do.
 */
export type EdgeStressSpec = {
  /** Where replicants run. */
  platform: Platform;
  /** Which EDGE to run against; it also selects the default timeouts and the Hub endpoint. */
  edge: EdgeTarget;

  /** Devices per identity; its length is the identity count and its sum the client count. */
  devicesPerIdentity: number[];
  /** Create an EDGE agent per identity — an always-online member that can admit late joiners. */
  agents: boolean;

  /** Slot counts the generator draws within; a command that exceeds them fails its precondition. */
  maxSpaces: number;
  maxDocumentsPerSpace: number;
  /** Commands that will *execute*, not commands drawn — most of a uniform draw is unreachable. */
  maxCommands: number;
  /**
   * How many command lists to draw from the seed; the longest is executed. `FastCheck.assert`
   * biases its first run toward tiny inputs (measured: 2 commands), so drawing and picking is what
   * actually yields a long sequence — deterministically, since the seed fixes every draw.
   */
  sampleDraws: number;
  /** Wall-clock budget; exhausting it stops issuing commands and proceeds to the final assertion. */
  maxRuntimeMs: number;
  /** How long a space may take to converge before a stall is called a failure rather than waited on. */
  quiescenceTimeoutMs: number;
  /** Mid-run quiesce-and-assert over the online members. */
  checkpoints: boolean;
  /**
   * Draw `GoOffline`/`GoOnline`/`Restart`. Off isolates convergence from partition tolerance, and
   * is the default while finding 5 stands — a cut link crashes the peer.
   */
  partitions: boolean;
  /**
   * Run this plan instead of drawing one: the commands inline, or the path of a
   * `command-trace.jsonl` from an earlier run (its last `plan` entry is used). Turns a
   * counterexample into a fixture — and lets one be shrunk by hand, since a sampled sequence has no
   * fast-check shrinker.
   */
  plan?: string | unknown[];
  /** Delete the spaces and identities the run created, through the self-serve routes first. */
  cleanup: boolean;
};

export type EdgeStressResult = {
  seed: string | undefined;
  /** Planned and executed are equal on a clean run; a gap means the run stopped early. */
  commandsPlanned: number;
  commandsExecuted: number;
  spacesCreated: number;
  documentsCreated: number;
  setupTimeMs: number;
  runTimeMs: number;
};

/** A read from a healthy peer answers in milliseconds; this is a hang detector, not a wait. */
const CALL_BUDGET_MS = 30_000;

//
// The live fleet.
//

/**
 * What the model is checked against, plus the bookkeeping that translates between them: the model
 * only ever names slots, so `spaceIds` and `invitationCodes` hold the real identifiers.
 */
export type Real = {
  spec: EdgeStressSpec;
  /** Resolved from `spec.edge`; the admin-key cleanup fallback posts here. */
  edgeUrl: string;
  deadline: number;
  replicants: ReplicantBrain<ClientReplicant>[];
  spaceIds: string[];
  invitationCodes: string[];
  /** Which client created each space, so cleanup can authenticate as somebody who may delete it. */
  spaceOwners: ClientIndex[];
  /** DIDs of the identities this run minted, in creation order; only cleanup reads them. */
  identityDids: string[];
  trace: (entry: Record<string, unknown>) => void;
  counters: { commands: number; documents: number };
};

/**
 * Bound one call to a replicant.
 *
 * RPC to a replicant is created with `timeout: 0`, and the scheduler only rescues the run when a
 * replicant *dies* — a peer that is alive but stuck inside `flush` or a query hangs the orchestrator
 * for as long as the run lasts, with no diagnosis. Every assertion-side call gets a deadline, so
 * that becomes a named failure against a named peer.
 */
const withDeadline = <T>(label: string, budgetMs: number, call: Promise<T>): Promise<T> =>
  asyncTimeout(call, budgetMs, new Error(`replicant call did not return within ${budgetMs}ms: ${label}`));

/** Sentinel: the time budget ran out, which ends the sequence normally rather than failing it. */
export class BudgetExhausted extends Error {}

/**
 * Membership is per identity, but a sibling device only receives the space through HALO
 * replication, which takes time. Mid-run assertions therefore cover the devices that actually hold
 * it; the final assertion is where every member device is required to.
 */
export const devicesHoldingSpace = async (
  real: Real,
  spaceSlot: number,
  clients: ClientIndex[],
): Promise<ClientIndex[]> => {
  const held = await Promise.all(
    clients.map(async (client) => ({
      client,
      has: await withDeadline(
        `hasSpace(client ${client}, space ${spaceSlot})`,
        CALL_BUDGET_MS,
        real.replicants[client].brain.hasSpace({ spaceId: real.spaceIds[spaceSlot] }),
      ),
    })),
  );
  return held.filter(({ has }) => has).map(({ client }) => client);
};

/** Wait for every member device to receive the space, which is itself part of "fully replicated". */
export const awaitSpaceOnAllDevices = async (real: Real, spaceSlot: number, clients: ClientIndex[]): Promise<void> => {
  const deadline = Date.now() + real.spec.quiescenceTimeoutMs;
  while (Date.now() < deadline) {
    const holding = await devicesHoldingSpace(real, spaceSlot, clients);
    if (holding.length === clients.length) {
      return;
    }
    await sleep(500);
  }
  const holding = await devicesHoldingSpace(real, spaceSlot, clients);
  const missing = clients.filter((client) => !holding.includes(client));
  throw new Error(`space ${spaceSlot} never reached member devices ${missing.join(', ')}`);
};

export const joinSpace = async (model: Model, real: Real, client: ClientIndex, spaceSlot: number): Promise<void> => {
  const identity = identityOf(model, client);
  const space = model.spaces[spaceSlot];
  await real.replicants[client].brain.joinSpace({ invitationCode: real.invitationCodes[spaceSlot] });
  space.pending.delete(identity);
  space.members.add(identity);
};

export const joinPendingSpaces = async (model: Model, real: Real, client: ClientIndex): Promise<void> => {
  for (const slot of resolvablePendingSpaces(model, client)) {
    await joinSpace(model, real, client, slot);
  }
};

/**
 * How long to let sync state settle before giving up on it and comparing digests anyway. Shorter
 * than the quiescence budget on purpose: this is a barrier, and the budget belongs to the
 * assertion that follows it.
 */
const SYNC_BARRIER_MS = 30_000;

/**
 * Wait until every named device reports the EDGE peer fully caught up, and report whether it did.
 *
 * Deliberately not an assertion. `getSyncState` is unreliable between EDGE and the client
 * (inkandswitch/subduction#286), so a peer that never reports caught-up is not evidence that its
 * data diverged — only the digest comparison that follows can say that. Failing here would turn a
 * bad signal into a red run and, worse, would do it *before* the ground truth is ever read.
 */
export const quiesce = async (real: Real, spaceSlot: number, clients: ClientIndex[]): Promise<boolean> => {
  const deadline = Date.now() + Math.min(SYNC_BARRIER_MS, real.spec.quiescenceTimeoutMs);
  const pending = new Map<ClientIndex, string>();

  for (const client of clients) {
    await withDeadline(
      `flush(client ${client}, space ${spaceSlot})`,
      real.spec.quiescenceTimeoutMs,
      real.replicants[client].brain.flush({ spaceId: real.spaceIds[spaceSlot] }),
    );
  }

  while (Date.now() < deadline) {
    pending.clear();
    for (const client of clients) {
      const state = await withDeadline(
        `getSyncState(client ${client}, space ${spaceSlot})`,
        CALL_BUDGET_MS,
        real.replicants[client].brain.getSyncState({ spaceId: real.spaceIds[spaceSlot] }),
      );
      if (
        !state.connected ||
        state.missingOnLocal !== 0 ||
        state.missingOnRemote !== 0 ||
        state.differentDocuments !== 0
      ) {
        pending.set(client, JSON.stringify(state));
      }
    }
    if (pending.size === 0) {
      return true;
    }
    await sleep(250);
  }

  log.warn('sync state never settled; comparing digests anyway', {
    space: spaceSlot,
    pending: [...pending],
  });
  return false;
};

/**
 * Delete what the run created, so a shared environment is left as it was found.
 *
 * Self-serve only, deliberately. Each identity's first device deletes the spaces its identity
 * created and then itself (`DELETE /data/space/:id`, `/data/identity/:did`), authenticating with a
 * verifiable presentation it signs — the credential the run already holds, scoped to exactly the
 * data it created. There is no admin-key fallback: a shared secret that can delete anything is not
 * something a test should carry, and having one masks the case this cleanup is supposed to prove.
 *
 * Nothing here throws: a cleanup failure must never mask the run's own result.
 */
export const cleanupRun = async (model: Model, real: Real): Promise<void> => {
  const spacesByIdentity = new Map<IdentityIndex, string[]>();
  real.spaceIds.forEach((spaceId, slot) => {
    if (!spaceId) {
      return;
    }
    const identity = identityOf(model, real.spaceOwners[slot]);
    spacesByIdentity.set(identity, [...(spacesByIdentity.get(identity) ?? []), spaceId]);
  });

  const refused: string[] = [];
  let accepted = 0;
  for (const [identity, { devices }] of model.identities.entries()) {
    const spaceIds = spacesByIdentity.get(identity) ?? [];
    try {
      const result = await real.replicants[devices[0]].brain.deleteOwnData({ spaceIds });
      accepted += result.accepted.length;
      refused.push(...result.refused);
    } catch (err) {
      log.warn('self-serve cleanup threw', { identity, err });
      refused.push(...spaceIds, real.identityDids[identity]);
    }
  }

  if (refused.length > 0) {
    // Loud: these are real rows left in a shared environment, and the trace is the only record.
    log.error('cleanup left data behind', { edgeUrl: real.edgeUrl, refused });
  }

  // Deletion is enqueued rather than synchronous, so this counts requests accepted, not state gone.
  real.trace({ event: 'cleanup', spaces: real.spaceIds.filter(Boolean).length, accepted, refused });
  log.info('cleanup done', { accepted, refused });
};

//
// Assertions: model versus system.
//

export const assertDigestsAgree = (
  digests: { client: ClientIndex; digest: SpaceDigest }[],
  spaceSlot: number,
): void => {
  if (digests.length < 2) {
    return;
  }
  const [reference, ...rest] = digests;
  for (const other of rest) {
    const a = canonical(reference.digest);
    const b = canonical(other.digest);
    if (a !== b) {
      throw new Error(
        `peers disagree on space ${spaceSlot}: client ${reference.client} = ${a}, client ${other.client} = ${b}`,
      );
    }
  }
};

/**
 * Everything a peer holds must be something the model knows about. The converse does not hold
 * mid-run: ops authored by a client that is currently offline may legitimately be missing.
 */
export const assertSubsetOfModel = (
  model: Model,
  spaceSlot: number,
  client: ClientIndex,
  digest: SpaceDigest,
): void => {
  const expected = expectedDigest(model, spaceSlot);
  for (const [docId, actual] of Object.entries(digest.docs)) {
    const reference = expected.docs[docId];
    if (!reference) {
      throw new Error(`client ${client} has unknown or deleted document ${docId} in space ${spaceSlot}`);
    }
    for (const value of actual.tokens) {
      if (!reference.tokens.includes(value)) {
        throw new Error(`client ${client} has unknown token ${value} in ${docId}`);
      }
    }
    actual.counters.forEach((value, slot) => {
      const limit = reference.counters[slot] ?? 0;
      if (value > limit) {
        throw new Error(`client ${client} counter ${slot} on ${docId} is ${value}, above the model's ${limit}`);
      }
    });
  }
};

export const assertEqualsModel = (model: Model, spaceSlot: number, client: ClientIndex, digest: SpaceDigest): void => {
  const expected = canonical(expectedDigest(model, spaceSlot));
  const actual = canonical(digest);
  if (expected !== actual) {
    // The raw text goes in the message: `tokens` is a regex's view of it, and when a merge splices
    // one token into another the regex output is not what the document actually holds.
    const raw = Object.entries(digest.docs)
      .map(([docId, doc]) => `    ${docId}: ${JSON.stringify(doc.content)}`)
      .join('\n');
    throw new Error(
      `client ${client} diverged from the model on space ${spaceSlot}:\n  model:  ${expected}\n  client: ${actual}\n  raw:\n${raw}`,
    );
  }
};

/**
 * Retry an assertion until it holds or the quiescence budget runs out.
 *
 * Convergence is a temporal property: a peer agrees *eventually*, and `quiesce` only proves that
 * each peer has nothing outstanding against EDGE — a document EDGE has not yet offered to the
 * other device leaves both sides reporting caught up while their digests differ. A failure here
 * means it never converged, which is the property worth asserting.
 */
const untilConverged = async (real: Real, check: () => Promise<void>): Promise<void> => {
  const deadline = Date.now() + real.spec.quiescenceTimeoutMs;
  for (;;) {
    try {
      await check();
      return;
    } catch (err) {
      if (Date.now() > deadline) {
        throw err;
      }
      await sleep(500);
    }
  }
};

/**
 * Mid-run assertion: quiesce every online member of every space against EDGE and require them to
 * agree with each other and to hold nothing the model does not know about.
 */
export const runCheckpoint = async (model: Model, real: Real): Promise<void> => {
  for (let slot = 0; slot < model.spaces.length; slot++) {
    const devices = await devicesHoldingSpace(real, slot, onlineMemberDevices(model, slot));
    if (devices.length === 0) {
      continue;
    }
    const settled = await quiesce(real, slot, devices);
    real.trace({ detail: 'checkpoint', space: slot, devices, syncSettled: settled });
    await untilConverged(real, async () => {
      const digests = await Promise.all(
        devices.map(async (client) => ({
          client,
          digest: await withDeadline(
            `digest(client ${client}, space ${slot})`,
            CALL_BUDGET_MS,
            real.replicants[client].brain.digest({ spaceId: real.spaceIds[slot] }),
          ),
        })),
      );
      assertDigestsAgree(digests, slot);
      for (const { client, digest } of digests) {
        assertSubsetOfModel(model, slot, client, digest);
      }
    });
  }
};

/**
 * The main assertion: bring everybody online, resolve every outstanding join, quiesce, and require
 * every device of every member identity to equal the model exactly.
 */
export const assertFullyReplicated = async (model: Model, real: Real): Promise<void> => {
  for (let client = 0; client < model.clients.length; client++) {
    if (model.clients[client].state === 'offline') {
      await real.replicants[client].brain.goOnline();
      model.clients[client].state = 'online';
    } else if (model.clients[client].state === 'down') {
      await real.replicants[client].brain.restart();
      model.clients[client].state = 'online';
    }
  }
  for (let client = 0; client < model.clients.length; client++) {
    await joinPendingSpaces(model, real, client);
  }

  for (let slot = 0; slot < model.spaces.length; slot++) {
    const devices = onlineMemberDevices(model, slot);
    log.info('final assertion', { space: slot, devices });
    await awaitSpaceOnAllDevices(real, slot, devices);
    const settled = await quiesce(real, slot, devices);
    real.trace({ detail: 'final', space: slot, devices, syncSettled: settled });
    await untilConverged(real, async () => {
      for (const client of devices) {
        const digest = await withDeadline(
          `digest(client ${client}, space ${slot})`,
          CALL_BUDGET_MS,
          real.replicants[client].brain.digest({ spaceId: real.spaceIds[slot] }),
        );
        assertEqualsModel(model, slot, client, digest);
      }
    });
  }
};
