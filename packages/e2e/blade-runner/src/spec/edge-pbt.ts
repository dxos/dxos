//
// Copyright 2026 DXOS.org
//

import * as fc from 'fast-check';
import fs from 'node:fs';
import path from 'node:path';

import { sleep } from '@dxos/async';
import { log } from '@dxos/log';

import { type SchedulerEnvImpl } from '../env';
import { type Platform, type ReplicantBrain, type ReplicantsSummary, type TestPlan, type TestProps } from '../plan';
import { ClientReplicant, type SpaceDigest } from '../replicants/client-replicant';

/**
 * Property-based test of a fleet of real clients replicating through EDGE.
 *
 * The orchestrator owns the model and every decision; replicants only execute. See
 * `.agents/projects/blade-runner-pbt/DESIGN.md` for the model, the command vocabulary and the
 * assertions this implements.
 */
export type EdgePbtSpec = {
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
   * How many command lists to draw from the seed; the longest is executed. `fc.assert` biases its
   * first run toward tiny inputs (measured: 2 commands), so drawing and picking is what actually
   * yields a long sequence — deterministically, since the seed fixes every draw.
   */
  sampleDraws: number;
  /** Wall-clock budget; exhausting it stops issuing commands and proceeds to the final assertion. */
  maxRuntimeMs: number;
  quiescenceTimeoutMs: number;
  /** Mid-run quiesce-and-assert over the online members. */
  checkpoints: boolean;
};

export type EdgePbtResult = {
  seed: string | undefined;
  commandsExecuted: number;
  spacesCreated: number;
  documentsCreated: number;
  setupTimeMs: number;
  runTimeMs: number;
};

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
  spec: EdgePbtSpec;
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
const resolvablePendingSpaces = (model: Model, client: ClientIndex): number[] => {
  const identity = identityOf(model, client);
  return model.spaces
    .map((space, slot) => ({ space, slot }))
    .filter(({ space, slot }) => space.pending.has(identity) && hasAdmittingDevice(model, slot))
    .map(({ slot }) => slot);
};

//
// Commands.
//

abstract class PbtCommand implements fc.AsyncCommand<Model, Real> {
  abstract check(model: Readonly<Model>): boolean;
  abstract run(model: Model, real: Real): Promise<void>;
  abstract toString(): string;

  /** Every executed command is recorded in logical terms, which is what makes a seed reproducible. */
  protected record(real: Real, fields: Record<string, unknown>): void {
    // Thrown before any model or system mutation, so the two never diverge on a budget stop.
    if (Date.now() > real.deadline) {
      throw new BudgetExhausted();
    }
    real.counters.commands++;
    real.trace({ seq: real.counters.commands, command: this.toString(), ...fields });
  }
}

class GoOfflineCommand extends PbtCommand {
  constructor(readonly client: ClientIndex) {
    super();
  }

  check = (model: Readonly<Model>) => model.clients[this.client].state === 'online';

  run = async (model: Model, real: Real) => {
    this.record(real, { client: this.client });
    model.clients[this.client].state = 'offline';
    await real.replicants[this.client].brain.goOffline();
  };

  toString = () => `GoOffline(${this.client})`;
}

class GoOnlineCommand extends PbtCommand {
  constructor(readonly client: ClientIndex) {
    super();
  }

  check = (model: Readonly<Model>) => model.clients[this.client].state === 'offline';

  run = async (model: Model, real: Real) => {
    this.record(real, { client: this.client });
    model.clients[this.client].state = 'online';
    await real.replicants[this.client].brain.goOnline();
    await joinPendingSpaces(model, real, this.client);
  };

  toString = () => `GoOnline(${this.client})`;
}

class RestartCommand extends PbtCommand {
  constructor(readonly client: ClientIndex) {
    super();
  }

  check = (model: Readonly<Model>) => model.clients[this.client].state !== 'down';

  run = async (model: Model, real: Real) => {
    this.record(real, { client: this.client });
    model.clients[this.client].state = 'online';
    await real.replicants[this.client].brain.restart();
    await joinPendingSpaces(model, real, this.client);
  };

  toString = () => `Restart(${this.client})`;
}

class CreateSpaceCommand extends PbtCommand {
  constructor(readonly client: ClientIndex) {
    super();
  }

  check = (model: Readonly<Model>) =>
    model.clients[this.client].state === 'online' && model.spaces.length < model.limits.maxSpaces;

  run = async (model: Model, real: Real) => {
    const slot = model.spaces.length;
    this.record(real, { client: this.client, space: slot });

    const creator = identityOf(model, this.client);
    const space: ModelSpace = {
      members: new Set([creator]),
      pending: new Set(model.identities.map((_, index) => index).filter((index) => index !== creator)),
      documents: [],
    };
    model.spaces.push(space);

    const brain = real.replicants[this.client].brain;
    const { spaceId } = await brain.createSpace({ label: `pbt-space-${slot}` });
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
  };

  toString = () => `CreateSpace(${this.client})`;
}

class JoinSpaceCommand extends PbtCommand {
  constructor(
    readonly client: ClientIndex,
    readonly spaceSlot: number,
  ) {
    super();
  }

  check = (model: Readonly<Model>) =>
    model.clients[this.client].state === 'online' &&
    this.spaceSlot < model.spaces.length &&
    model.spaces[this.spaceSlot].pending.has(identityOf(model, this.client)) &&
    hasAdmittingDevice(model, this.spaceSlot);

  run = async (model: Model, real: Real) => {
    this.record(real, { client: this.client, space: this.spaceSlot });
    await joinSpace(model, real, this.client, this.spaceSlot);
  };

  toString = () => `JoinSpace(${this.client}, ${this.spaceSlot})`;
}

class CreateDocumentCommand extends PbtCommand {
  constructor(
    readonly client: ClientIndex,
    readonly spaceSlot: number,
  ) {
    super();
  }

  check = (model: Readonly<Model>) =>
    canAct(model, this.client) &&
    this.spaceSlot < model.spaces.length &&
    isMember(model, this.client, this.spaceSlot) &&
    model.spaces[this.spaceSlot].documents.length < model.limits.maxDocumentsPerSpace;

  run = async (model: Model, real: Real) => {
    const space = model.spaces[this.spaceSlot];
    const slot = space.documents.length;
    const id = documentId(this.spaceSlot, slot);
    this.record(real, { client: this.client, space: this.spaceSlot, document: slot, docId: id });

    space.documents.push({ deleted: false, tokens: new Set(), counters: new Map() });
    real.counters.documents++;

    await real.replicants[this.client].brain.createDocument({
      spaceId: real.spaceIds[this.spaceSlot],
      docId: id,
      counterSlots: model.clients.length,
    });
  };

  toString = () => `CreateDocument(${this.client}, ${this.spaceSlot})`;
}

class EditTextCommand extends PbtCommand {
  constructor(
    readonly client: ClientIndex,
    readonly spaceSlot: number,
    readonly documentSlot: number,
    readonly positionRatio: number,
  ) {
    super();
  }

  check = (model: Readonly<Model>) =>
    canAct(model, this.client) &&
    isMember(model, this.client, this.spaceSlot) &&
    liveDocument(model, this.spaceSlot, this.documentSlot) !== undefined;

  run = async (model: Model, real: Real) => {
    const document = liveDocument(model, this.spaceSlot, this.documentSlot)!;
    const value = token(this.client, ++model.opSeq);
    this.record(real, {
      client: this.client,
      space: this.spaceSlot,
      document: this.documentSlot,
      token: value,
    });

    document.tokens.add(value);
    await real.replicants[this.client].brain.editDocumentText({
      spaceId: real.spaceIds[this.spaceSlot],
      docId: documentId(this.spaceSlot, this.documentSlot),
      token: value,
      positionRatio: this.positionRatio,
    });
  };

  toString = () => `EditText(${this.client}, ${this.spaceSlot}, ${this.documentSlot})`;
}

class EditCounterCommand extends PbtCommand {
  constructor(
    readonly client: ClientIndex,
    readonly spaceSlot: number,
    readonly documentSlot: number,
  ) {
    super();
  }

  check = (model: Readonly<Model>) =>
    canAct(model, this.client) &&
    isMember(model, this.client, this.spaceSlot) &&
    liveDocument(model, this.spaceSlot, this.documentSlot) !== undefined;

  run = async (model: Model, real: Real) => {
    const document = liveDocument(model, this.spaceSlot, this.documentSlot)!;
    const next = (document.counters.get(this.client) ?? 0) + 1;
    this.record(real, {
      client: this.client,
      space: this.spaceSlot,
      document: this.documentSlot,
      value: next,
    });

    document.counters.set(this.client, next);
    await real.replicants[this.client].brain.editDocumentCounter({
      spaceId: real.spaceIds[this.spaceSlot],
      docId: documentId(this.spaceSlot, this.documentSlot),
      slot: this.client,
    });
  };

  toString = () => `EditCounter(${this.client}, ${this.spaceSlot}, ${this.documentSlot})`;
}

class DeleteDocumentCommand extends PbtCommand {
  constructor(
    readonly client: ClientIndex,
    readonly spaceSlot: number,
    readonly documentSlot: number,
  ) {
    super();
  }

  check = (model: Readonly<Model>) =>
    canAct(model, this.client) &&
    isMember(model, this.client, this.spaceSlot) &&
    liveDocument(model, this.spaceSlot, this.documentSlot) !== undefined;

  run = async (model: Model, real: Real) => {
    const document = liveDocument(model, this.spaceSlot, this.documentSlot)!;
    this.record(real, { client: this.client, space: this.spaceSlot, document: this.documentSlot });

    document.deleted = true;
    await real.replicants[this.client].brain.deleteDocument({
      spaceId: real.spaceIds[this.spaceSlot],
      docId: documentId(this.spaceSlot, this.documentSlot),
    });
  };

  toString = () => `DeleteDocument(${this.client}, ${this.spaceSlot}, ${this.documentSlot})`;
}

/**
 * Mid-run assertion: quiesce every online member of every space against EDGE and require them to
 * agree with each other and to hold nothing the model does not know about. Ops authored by clients
 * that are currently offline may legitimately be missing — that is the consistency window, so this
 * is a subset check rather than equality.
 */
class CheckpointCommand extends PbtCommand {
  check = (model: Readonly<Model>) => model.clients.some((client) => client.state === 'online');

  run = async (model: Model, real: Real) => {
    this.record(real, {});
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

  toString = () => 'Checkpoint()';
}

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

export class EdgePbt implements TestPlan<EdgePbtSpec, EdgePbtResult> {
  defaultSpec(): EdgePbtSpec {
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

  async run(env: SchedulerEnvImpl<EdgePbtSpec>, params: TestProps<EdgePbtSpec>): Promise<EdgePbtResult> {
    const spec = params.spec;
    const clientCount = spec.devicesPerIdentity.reduce((sum, count) => sum + count, 0);
    const tracePath = path.join(params.outDir, 'command-trace.jsonl');
    const traceStream = fs.createWriteStream(tracePath, { flags: 'a' });
    const trace = (entry: Record<string, unknown>) => {
      traceStream.write(`${JSON.stringify(entry)}\n`);
    };

    log.info('edge-pbt starting', { seed: params.randomSeed, clientCount, spec });
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

    const clients = fc.nat({ max: clientCount - 1 });
    const spaces = fc.nat({ max: Math.max(spec.maxSpaces - 1, 0) });
    const documents = fc.nat({ max: Math.max(spec.maxDocumentsPerSpace - 1, 0) });

    const commands = [
      clients.map((client) => new GoOfflineCommand(client)),
      clients.map((client) => new GoOnlineCommand(client)),
      clients.map((client) => new RestartCommand(client)),
      clients.map((client) => new CreateSpaceCommand(client)),
      fc.tuple(clients, spaces).map(([client, space]) => new JoinSpaceCommand(client, space)),
      fc.tuple(clients, spaces).map(([client, space]) => new CreateDocumentCommand(client, space)),
      fc
        .tuple(clients, spaces, documents, fc.double({ min: 0, max: 0.999, noNaN: true }))
        .map(([client, space, document, ratio]) => new EditTextCommand(client, space, document, ratio)),
      fc
        .tuple(clients, spaces, documents)
        .map(([client, space, document]) => new EditCounterCommand(client, space, document)),
      fc
        .tuple(clients, spaces, documents)
        .map(([client, space, document]) => new DeleteDocumentCommand(client, space, document)),
      ...(spec.checkpoints ? [fc.constant(new CheckpointCommand())] : []),
    ];

    const runBegin = Date.now();
    real.deadline = runBegin + spec.maxRuntimeMs;

    // Draw every candidate sequence from the seed and execute the longest.
    const draws = fc.sample(fc.commands(commands, { maxCommands: spec.maxCommands, size: 'large' }), {
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
        await fc.asyncModelRun(() => ({ model, real }), generated);
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
    env: SchedulerEnvImpl<EdgePbtSpec>,
    params: TestProps<EdgePbtSpec>,
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
      await replicants[owner].brain.createIdentity({ displayName: `pbt-identity-${identity}` });
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
    params: TestProps<EdgePbtSpec>,
    summary: ReplicantsSummary,
    result: EdgePbtResult,
  ): Promise<EdgePbtResult> {
    log.info('edge-pbt result', { result });
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
