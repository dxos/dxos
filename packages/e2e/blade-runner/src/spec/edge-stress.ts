//
// Copyright 2026 DXOS.org
//

import { Schema } from 'effect';
import { FastCheck } from 'effect/testing';
import fs from 'node:fs';
import path from 'node:path';

import { sleep } from '@dxos/async';
import { log } from '@dxos/log';

import { type SchedulerEnvImpl } from '../env';
import { type Platform, type ReplicantBrain, type ReplicantsSummary, type TestPlan, type TestProps } from '../plan';
import { ClientReplicant, type SpaceDigest } from '../replicants/client-replicant';

/**
 * Randomized stress test of a fleet of real clients replicating through EDGE.
 *
 * The orchestrator owns the model and every decision; replicants only execute. See
 * `.agents/projects/blade-runner-edge-stress/DESIGN.md` for the model, the operation vocabulary
 * and the assertions this implements.
 */
export type EdgeStressSpec = {
  platform: Platform;
  edgeUrl: string;

  /** Devices per identity; its length is the identity count and its sum the client count. */
  devicesPerIdentity: number[];
  /** Create an EDGE agent per identity — an always-online member that can admit late joiners. */
  agents: boolean;

  maxSpaces: number;
  maxDocumentsPerSpace: number;
  maxCommands: number;
  /**
   * How many command lists to draw from the seed; the longest is executed. `FastCheck.assert`
   * biases its first run toward tiny inputs (measured: 2 commands), so drawing and picking is what
   * actually yields a long sequence — deterministically, since the seed fixes every draw.
   */
  sampleDraws: number;
  /** Wall-clock budget; exhausting it stops issuing commands and proceeds to the final assertion. */
  maxRuntimeMs: number;
  quiescenceTimeoutMs: number;
  /** Mid-run quiesce-and-assert over the online members. */
  checkpoints: boolean;
};

export type EdgeStressResult = {
  seed: string | undefined;
  commandsExecuted: number;
  spacesCreated: number;
  documentsCreated: number;
  setupTimeMs: number;
  runTimeMs: number;
};

//
// Operation vocabulary.
//

/**
 * The operations, as Effect schemas: one schema defines what may be generated, what a trace line
 * contains, and what a trace line decodes back into.
 *
 * Index ranges are literal unions rather than range-checked integers — the vocabulary is genuinely
 * finite, so generation needs no rejection, and repeated draws collide on the same slot, which is
 * where concurrent-merge defects live.
 */
const makeCommandSchema = ({ clients, spaces, documents }: { clients: number; spaces: number; documents: number }) => {
  const slots = (count: number) => Schema.Literals(Array.from({ length: Math.max(count, 1) }, (_, index) => index));
  const client = slots(clients);
  const space = slots(spaces);
  const document = slots(documents);
  // Boundary-heavy on purpose: concurrent inserts at the same offset are what exercise text merge.
  const position = Schema.Literals([0, 0.25, 0.5, 0.75, 0.999]);

  return Schema.TaggedUnion({
    GoOffline: { client },
    GoOnline: { client },
    Restart: { client },
    CreateSpace: { client },
    JoinSpace: { client, space },
    CreateDocument: { client, space },
    EditText: { client, space, document, position },
    EditCounter: { client, space, document },
    DeleteDocument: { client, space, document },
    Checkpoint: {},
  });
};

type Command = ReturnType<typeof makeCommandSchema>['Type'];

//
// Model.
//

type ClientIndex = number;
type IdentityIndex = number;

type ClientState = 'online' | 'offline' | 'down';

type ModelDocument = {
  deleted: boolean;
  tokens: Set<string>;
  counters: Map<ClientIndex, number>;
};

type ModelSpace = {
  members: Set<IdentityIndex>;
  pending: Set<IdentityIndex>;
  documents: ModelDocument[];
};

type Model = {
  clients: { identity: IdentityIndex; state: ClientState }[];
  identities: { devices: ClientIndex[] }[];
  spaces: ModelSpace[];
  opSeq: number;
  /** Mirrored from the spec so preconditions stay a pure function of the model. */
  limits: { maxSpaces: number; maxDocumentsPerSpace: number; agents: boolean };
};

/** Sentinel: the time budget ran out, which ends the sequence normally rather than failing it. */
class BudgetExhausted extends Error {}

type Real = {
  spec: EdgeStressSpec;
  deadline: number;
  replicants: ReplicantBrain<ClientReplicant>[];
  /** Real space ids by slot (creation order); the model only ever names slots. */
  spaceIds: string[];
  invitationCodes: string[];
  trace: (entry: Record<string, unknown>) => void;
  counters: { commands: number; documents: number };
};

const token = (client: ClientIndex, seq: number): string => `⟦c${client}-${seq}⟧`;

const documentId = (spaceSlot: number, documentSlot: number): string => `s${spaceSlot}-d${documentSlot}`;

//
// Model helpers. All preconditions read the model only — fast-check requires `check` to be pure.
//

const identityOf = (model: Model, client: ClientIndex): IdentityIndex => model.clients[client].identity;

const isMember = (model: Model, client: ClientIndex, spaceSlot: number): boolean =>
  model.spaces[spaceSlot]?.members.has(identityOf(model, client)) ?? false;

const canAct = (model: Model, client: ClientIndex): boolean => model.clients[client].state !== 'down';

const liveDocument = (model: Model, spaceSlot: number, documentSlot: number): ModelDocument | undefined => {
  const document = model.spaces[spaceSlot]?.documents[documentSlot];
  return document && !document.deleted ? document : undefined;
};

/**
 * Whether some device of a member identity is online and can therefore admit a joiner. The agent
 * is always online, so an identity with an agent always qualifies once it is a member.
 */
const hasAdmittingDevice = (model: Model, spaceSlot: number): boolean => {
  const space = model.spaces[spaceSlot];
  if (!space) {
    return false;
  }
  if (model.limits.agents && space.members.size > 0) {
    return true;
  }
  return [...space.members].some((identity) =>
    model.identities[identity].devices.some((device) => model.clients[device].state === 'online'),
  );
};

/**
 * A client coming online joins every space its identity is still pending on, provided somebody can
 * admit it — decision D2, "eventually joins".
 */
const resolvablePendingSpaces = (model: Model, client: ClientIndex): number[] =>
  model.spaces
    .map((space, slot) => ({ space, slot }))
    .filter(({ space, slot }) => space.pending.has(identityOf(model, client)) && hasAdmittingDevice(model, slot))
    .map(({ slot }) => slot);

//
// Interpreter. `canRun` is the precondition, `execute` advances model and system together.
//

const canRun = (command: Command, model: Model): boolean => {
  switch (command._tag) {
    case 'GoOffline':
      return model.clients[command.client].state === 'online';
    case 'GoOnline':
      return model.clients[command.client].state === 'offline';
    case 'Restart':
      return model.clients[command.client].state !== 'down';
    case 'CreateSpace':
      return model.clients[command.client].state === 'online' && model.spaces.length < model.limits.maxSpaces;
    case 'JoinSpace':
      return (
        model.clients[command.client].state === 'online' &&
        command.space < model.spaces.length &&
        model.spaces[command.space].pending.has(identityOf(model, command.client)) &&
        hasAdmittingDevice(model, command.space)
      );
    case 'CreateDocument':
      return (
        canAct(model, command.client) &&
        command.space < model.spaces.length &&
        isMember(model, command.client, command.space) &&
        model.spaces[command.space].documents.length < model.limits.maxDocumentsPerSpace
      );
    case 'EditText':
    case 'EditCounter':
    case 'DeleteDocument':
      return (
        canAct(model, command.client) &&
        isMember(model, command.client, command.space) &&
        liveDocument(model, command.space, command.document) !== undefined
      );
    case 'Checkpoint':
      return model.clients.some((client) => client.state === 'online');
  }
};

const execute = async (command: Command, model: Model, real: Real): Promise<void> => {
  // Thrown before any model or system mutation, so the two never diverge on a budget stop.
  if (Date.now() > real.deadline) {
    throw new BudgetExhausted();
  }
  real.counters.commands++;
  real.trace({ seq: real.counters.commands, ...command });

  switch (command._tag) {
    case 'GoOffline': {
      model.clients[command.client].state = 'offline';
      await real.replicants[command.client].brain.goOffline();
      break;
    }

    case 'GoOnline': {
      model.clients[command.client].state = 'online';
      await real.replicants[command.client].brain.goOnline();
      await joinPendingSpaces(model, real, command.client);
      break;
    }

    case 'Restart': {
      model.clients[command.client].state = 'online';
      await real.replicants[command.client].brain.restart();
      await joinPendingSpaces(model, real, command.client);
      break;
    }

    case 'CreateSpace': {
      const slot = model.spaces.length;
      const creator = identityOf(model, command.client);
      const space: ModelSpace = {
        members: new Set([creator]),
        pending: new Set(model.identities.map((_, index) => index).filter((index) => index !== creator)),
        documents: [],
      };
      model.spaces.push(space);

      const brain = real.replicants[command.client].brain;
      const { spaceId } = await brain.createSpace({ label: `edge-stress-space-${slot}` });
      const { invitationCode } = await brain.shareSpace({ spaceId });
      real.spaceIds[slot] = spaceId;
      real.invitationCodes[slot] = invitationCode;

      // Every other identity that can join right now does; the rest stay pending (D2).
      for (const identity of [...space.pending]) {
        const device = model.identities[identity].devices.find(
          (candidate) => model.clients[candidate].state === 'online',
        );
        if (device !== undefined) {
          await joinSpace(model, real, device, slot);
        }
      }
      break;
    }

    case 'JoinSpace': {
      await joinSpace(model, real, command.client, command.space);
      break;
    }

    case 'CreateDocument': {
      const space = model.spaces[command.space];
      const slot = space.documents.length;
      space.documents.push({ deleted: false, tokens: new Set(), counters: new Map() });
      real.counters.documents++;

      await real.replicants[command.client].brain.createDocument({
        spaceId: real.spaceIds[command.space],
        docId: documentId(command.space, slot),
        counterSlots: model.clients.length,
      });
      break;
    }

    case 'EditText': {
      const document = liveDocument(model, command.space, command.document)!;
      const value = token(command.client, ++model.opSeq);
      document.tokens.add(value);
      real.trace({ seq: real.counters.commands, detail: 'token', token: value });

      await real.replicants[command.client].brain.editDocumentText({
        spaceId: real.spaceIds[command.space],
        docId: documentId(command.space, command.document),
        token: value,
        positionRatio: command.position,
      });
      break;
    }

    case 'EditCounter': {
      const document = liveDocument(model, command.space, command.document)!;
      document.counters.set(command.client, (document.counters.get(command.client) ?? 0) + 1);

      await real.replicants[command.client].brain.editDocumentCounter({
        spaceId: real.spaceIds[command.space],
        docId: documentId(command.space, command.document),
        slot: command.client,
      });
      break;
    }

    case 'DeleteDocument': {
      liveDocument(model, command.space, command.document)!.deleted = true;

      await real.replicants[command.client].brain.deleteDocument({
        spaceId: real.spaceIds[command.space],
        docId: documentId(command.space, command.document),
      });
      break;
    }

    case 'Checkpoint': {
      await runCheckpoint(model, real);
      break;
    }
  }
};

const describe = (command: Command): string => {
  const { _tag, ...args } = command;
  const values = Object.values(args);
  return values.length > 0 ? `${_tag}(${values.join(', ')})` : `${_tag}()`;
};

const toAsyncCommand = (command: Command): FastCheck.AsyncCommand<Model, Real> => ({
  check: (model) => canRun(command, model),
  run: (model, real) => execute(command, model, real),
  toString: () => describe(command),
});

/**
 * Mid-run assertion: quiesce every online member of every space against EDGE and require them to
 * agree with each other and to hold nothing the model does not know about. Ops authored by clients
 * that are currently offline may legitimately be missing — that is the consistency window, so this
 * is a subset check rather than equality.
 */
const runCheckpoint = async (model: Model, real: Real): Promise<void> => {
  for (let slot = 0; slot < model.spaces.length; slot++) {
    const devices = await devicesHoldingSpace(real, slot, onlineMemberDevices(model, slot));
    if (devices.length === 0) {
      continue;
    }
    await quiesce(real, slot, devices);
    const digests = await Promise.all(
      devices.map(async (client) => ({
        client,
        digest: await real.replicants[client].brain.digest({ spaceId: real.spaceIds[slot] }),
      })),
    );
    assertDigestsAgree(digests, slot);
    for (const { client, digest } of digests) {
      assertSubsetOfModel(model, slot, client, digest);
    }
  }
};

//
// System helpers.
//

const onlineMemberDevices = (model: Model, spaceSlot: number): ClientIndex[] =>
  model.clients
    .map((client, index) => ({ client, index }))
    .filter(({ client, index }) => client.state === 'online' && isMember(model, index, spaceSlot))
    .map(({ index }) => index);

/**
 * Membership is per identity, but a sibling device only receives the space through HALO
 * replication, which takes time. Mid-run assertions therefore cover the devices that actually hold
 * it; the final assertion is where every member device is required to.
 */
const devicesHoldingSpace = async (real: Real, spaceSlot: number, clients: ClientIndex[]): Promise<ClientIndex[]> => {
  const held = await Promise.all(
    clients.map(async (client) => ({
      client,
      has: await real.replicants[client].brain.hasSpace({ spaceId: real.spaceIds[spaceSlot] }),
    })),
  );
  return held.filter(({ has }) => has).map(({ client }) => client);
};

/** Wait for every member device to receive the space, which is itself part of "fully replicated". */
const awaitSpaceOnAllDevices = async (real: Real, spaceSlot: number, clients: ClientIndex[]): Promise<void> => {
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

const joinSpace = async (model: Model, real: Real, client: ClientIndex, spaceSlot: number): Promise<void> => {
  const identity = identityOf(model, client);
  const space = model.spaces[spaceSlot];
  await real.replicants[client].brain.joinSpace({ invitationCode: real.invitationCodes[spaceSlot] });
  space.pending.delete(identity);
  space.members.add(identity);
};

const joinPendingSpaces = async (model: Model, real: Real, client: ClientIndex): Promise<void> => {
  for (const slot of resolvablePendingSpaces(model, client)) {
    await joinSpace(model, real, client, slot);
  }
};

/**
 * Wait until every named device reports the EDGE peer fully caught up. A timeout here is a real
 * finding (sync stuck), not a flake, so it fails rather than proceeding.
 */
const quiesce = async (real: Real, spaceSlot: number, clients: ClientIndex[]): Promise<void> => {
  const deadline = Date.now() + real.spec.quiescenceTimeoutMs;
  const pending = new Map<ClientIndex, string>();

  for (const client of clients) {
    await real.replicants[client].brain.flush({ spaceId: real.spaceIds[spaceSlot] });
  }

  while (Date.now() < deadline) {
    pending.clear();
    for (const client of clients) {
      const state = await real.replicants[client].brain.getSyncState({ spaceId: real.spaceIds[spaceSlot] });
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
      return;
    }
    await sleep(250);
  }

  throw new Error(
    `sync did not quiesce for space ${spaceSlot} within ${real.spec.quiescenceTimeoutMs}ms: ${JSON.stringify([
      ...pending,
    ])}`,
  );
};

const expectedDigest = (model: Model, spaceSlot: number): SpaceDigest => {
  const docs: SpaceDigest['docs'] = {};
  model.spaces[spaceSlot].documents.forEach((document, slot) => {
    if (document.deleted) {
      return;
    }
    docs[documentId(spaceSlot, slot)] = {
      tokens: [...document.tokens].sort(),
      counters: model.clients.map((_, client) => document.counters.get(client) ?? 0),
    };
  });
  return { docs };
};

/**
 * Digest key order follows each peer's own query order, so equality has to be checked on a
 * canonical form or identical states would compare unequal.
 */
const canonical = (digest: SpaceDigest): string =>
  JSON.stringify(
    Object.keys(digest.docs)
      .sort()
      .map((docId) => [docId, digest.docs[docId].tokens, digest.docs[docId].counters]),
  );

const assertDigestsAgree = (digests: { client: ClientIndex; digest: SpaceDigest }[], spaceSlot: number): void => {
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

const assertSubsetOfModel = (model: Model, spaceSlot: number, client: ClientIndex, digest: SpaceDigest): void => {
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

const assertEqualsModel = (model: Model, spaceSlot: number, client: ClientIndex, digest: SpaceDigest): void => {
  const expected = canonical(expectedDigest(model, spaceSlot));
  const actual = canonical(digest);
  if (expected !== actual) {
    throw new Error(
      `client ${client} diverged from the model on space ${spaceSlot}:\n  model:  ${expected}\n  client: ${actual}`,
    );
  }
};

/**
 * The main assertion: bring everybody online, resolve every outstanding join, quiesce, and require
 * every device of every member identity to equal the model exactly.
 */
const assertFullyReplicated = async (model: Model, real: Real): Promise<void> => {
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
    await quiesce(real, slot, devices);
    for (const client of devices) {
      const digest = await real.replicants[client].brain.digest({ spaceId: real.spaceIds[slot] });
      assertEqualsModel(model, slot, client, digest);
    }
  }
};

//
// Plan.
//

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
    const { replicants, model } = await this._setupFleet(env, params, clientCount);
    const setupTimeMs = Date.now() - setupBegin;
    log.info('fleet ready', { setupTimeMs });

    const real: Real = {
      spec,
      replicants,
      deadline: Number.MAX_SAFE_INTEGER,
      spaceIds: [],
      invitationCodes: [],
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
  ): Promise<{ replicants: ReplicantBrain<ClientReplicant>[]; model: Model }> {
    const spec = params.spec;

    const replicants: ReplicantBrain<ClientReplicant>[] = [];
    for (let index = 0; index < clientCount; index++) {
      const replicant = await env.spawn(ClientReplicant, { platform: spec.platform });
      await replicant.brain.init({ edgeUrl: spec.edgeUrl, agents: spec.agents });
      replicants.push(replicant);
    }

    const model: Model = {
      clients: [],
      identities: [],
      spaces: [],
      opSeq: 0,
      limits: {
        maxSpaces: spec.maxSpaces,
        maxDocumentsPerSpace: spec.maxDocumentsPerSpace,
        agents: spec.agents,
      },
    };

    let cursor = 0;
    for (const [identity, devices] of spec.devicesPerIdentity.entries()) {
      const owner = cursor;
      await replicants[owner].brain.createIdentity({ displayName: `edge-stress-identity-${identity}` });
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

    return { replicants, model };
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
