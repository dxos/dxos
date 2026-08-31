//
// Copyright 2026 DXOS.org
//

import { Schema } from 'effect';
import { FastCheck } from 'effect/testing';

import { invariant } from '@dxos/invariant';

import {
  type ClientIndex,
  type IdentityIndex,
  type Model,
  type ModelDocument,
  type ModelSpace,
  documentId,
  identityOf,
  canAct,
  hasAdmittingDevice,
  holdsSpace,
  isMember,
  liveDocument,
  resolvablePendingSpaces,
  token,
} from './model';
import { type Real, BudgetExhausted, awaitSpaceOnAllDevices, runCheckpoint } from './system';

/**
 * The operation vocabulary, as Effect schemas: one declaration defines what may be generated, what
 * a trace line contains, and what a trace line decodes back into.
 *
 * Index ranges are literal unions rather than range-checked integers — the vocabulary is genuinely
 * finite, so generation needs no rejection, and repeated draws collide on the same slot, which is
 * where concurrent-merge defects live.
 */
export const makeCommandSchema = ({
  clients,
  spaces,
  documents,
}: {
  clients: number;
  spaces: number;
  documents: number;
}) => {
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

export type Command = ReturnType<typeof makeCommandSchema>['Type'];

/**
 * Relative draw frequency per operation.
 *
 * A uniform draw spends the whole budget before it tests anything: `Restart` and `Checkpoint` are
 * enabled from the first command, while every data operation has to wait for a space and a
 * document to exist, so a uniform 25-command plan reaches roughly one edit. Weighting also buys
 * wall-clock — a `Restart` tears down and re-initialises a client and a `Checkpoint` quiesces the
 * whole fleet, where an edit is milliseconds.
 */
const COMMAND_WEIGHTS: Record<Command['_tag'], number> = {
  EditText: 8,
  EditCounter: 5,
  CreateDocument: 4,
  CreateSpace: 3,
  JoinSpace: 3,
  GoOffline: 3,
  GoOnline: 3,
  Restart: 2,
  Checkpoint: 2,
  // Rare: a deleted slot still counts against `maxDocumentsPerSpace`, so frequent deletes starve
  // the run of anything to edit.
  DeleteDocument: 1,
};

/**
 * Cuts or restores a peer's link. Excluded by a `partitions: false` run, which isolates the
 * convergence property from the partition-tolerance one — useful when a defect in the second
 * blocks every run before it can test the first.
 */
const PARTITION_COMMANDS = new Set(['GoOffline', 'GoOnline', 'Restart']);

/** Mutates replicated state — what a plan has to reach for convergence to be tested at all. */
export const mutatesData = (command: Command): boolean =>
  command._tag === 'CreateDocument' ||
  command._tag === 'EditText' ||
  command._tag === 'EditCounter' ||
  command._tag === 'DeleteDocument';

/**
 * The weighted generator over the whole vocabulary. Per-tag arbitraries come from the same schema
 * declaration, so a weight can never name an operation that does not exist.
 */
export const makeCommandArbitrary = ({
  checkpoints,
  partitions,
  ...slots
}: Parameters<typeof makeCommandSchema>[0] & {
  checkpoints: boolean;
  partitions: boolean;
}): FastCheck.Arbitrary<Command> => {
  const weights = new Map(Object.entries(COMMAND_WEIGHTS));
  const cases = Object.entries(makeCommandSchema(slots).cases)
    .filter(([tag]) => (tag !== 'Checkpoint' || checkpoints) && (partitions || !PARTITION_COMMANDS.has(tag)))
    .map(([tag, member]) => {
      const weight = weights.get(tag);
      invariant(weight !== undefined, `no draw weight for ${tag}`);
      return { arbitrary: Schema.toArbitrary(member)(FastCheck), weight };
    });
  return FastCheck.oneof(...cases);
};

/** The precondition. Reads the model only, which is what fast-check requires of `check`. */
export const canRun = (command: Command, model: Model): boolean => {
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
        holdsSpace(model, command.client, command.space) &&
        model.spaces[command.space].documents.length < model.limits.maxDocumentsPerSpace
      );
    case 'EditText':
    case 'EditCounter':
    case 'DeleteDocument':
      return (
        canAct(model, command.client) &&
        holdsSpace(model, command.client, command.space) &&
        liveDocument(model, command.space, command.document) !== undefined
      );
    case 'Checkpoint':
      return model.clients.some((client) => client.state === 'online');
  }
};

/**
 * What the model transition decided, handed to the system half so it cannot pick differently.
 * Slots and the token are minted here because the model owns them; the fleet only mirrors them.
 */
export type Transition = {
  joins: { client: ClientIndex; space: number }[];
  /** Devices that should now receive the space through HALO rather than by joining it. */
  learned: { client: ClientIndex; space: number }[];
  spaceSlot?: number;
  documentSlot?: number;
  token?: string;
};

/**
 * The model half of a command, in full and with no I/O.
 *
 * Separating it is what makes a sequence simulable: `plan.ts` runs this against a throwaway model
 * to learn which commands will survive their preconditions, so the recorded plan is what executes
 * rather than what was drawn.
 */
export const advance = (command: Command, model: Model): Transition => {
  const joins: Transition['joins'] = [];
  const learned: Transition['learned'] = [];
  /** A space reaches every *online* device of a member identity; an offline one has to wait. */
  const learn = (space: number, identity: IdentityIndex): void => {
    for (const device of model.identities[identity].devices) {
      if (model.clients[device].state === 'online' && !model.spaces[space].knownBy.has(device)) {
        model.spaces[space].knownBy.add(device);
        learned.push({ client: device, space });
      }
    }
  };
  // The precondition already guarantees the document is live; asserting says so rather than
  // asking the type-checker to take it on faith.
  const documentAt = (spaceSlot: number, documentSlot: number): ModelDocument => {
    const document = liveDocument(model, spaceSlot, documentSlot);
    invariant(document, `no live document ${spaceSlot}/${documentSlot}`);
    return document;
  };
  const join = (client: ClientIndex, space: number): void => {
    const identity = identityOf(model, client);
    model.spaces[space].pending.delete(identity);
    model.spaces[space].members.add(identity);
    model.spaces[space].knownBy.add(client);
    joins.push({ client, space });
    learn(space, identity);
  };

  switch (command._tag) {
    case 'GoOffline': {
      model.clients[command.client].state = 'offline';
      break;
    }

    case 'GoOnline':
    case 'Restart': {
      model.clients[command.client].state = 'online';
      for (const slot of resolvablePendingSpaces(model, command.client)) {
        join(command.client, slot);
      }
      // Back online, it catches up on every space its identity joined while it was away.
      const identity = identityOf(model, command.client);
      model.spaces.forEach((space, slot) => {
        if (space.members.has(identity)) {
          learn(slot, identity);
        }
      });
      break;
    }

    case 'CreateSpace': {
      const creator = identityOf(model, command.client);
      const spaceSlot = model.spaces.length;
      const space: ModelSpace = {
        members: new Set([creator]),
        pending: new Set(model.identities.map((_, index) => index).filter((index) => index !== creator)),
        knownBy: new Set([command.client]),
        documents: [],
      };
      model.spaces.push(space);
      learn(spaceSlot, creator);

      // Every other identity that can join right now does; the rest stay pending (D2).
      for (const identity of [...space.pending]) {
        const device = model.identities[identity].devices.find(
          (candidate) => model.clients[candidate].state === 'online',
        );
        if (device !== undefined) {
          join(device, spaceSlot);
        }
      }
      return { joins, learned, spaceSlot };
    }

    case 'JoinSpace': {
      join(command.client, command.space);
      break;
    }

    case 'CreateDocument': {
      const documents = model.spaces[command.space].documents;
      const documentSlot = documents.length;
      documents.push({ deleted: false, tokens: new Set(), counters: new Map() });
      return { joins, learned, documentSlot };
    }

    case 'EditText': {
      const value = token(command.client, ++model.opSeq);
      documentAt(command.space, command.document).tokens.add(value);
      return { joins, learned, token: value };
    }

    case 'EditCounter': {
      const document = documentAt(command.space, command.document);
      document.counters.set(command.client, (document.counters.get(command.client) ?? 0) + 1);
      break;
    }

    case 'DeleteDocument': {
      documentAt(command.space, command.document).deleted = true;
      break;
    }

    case 'Checkpoint':
      break;
  }

  return { joins, learned };
};

/**
 * The subsequence of a draw that will actually run, and the model it leaves behind.
 *
 * A drawn sequence opens with `JoinSpace`/`EditText` long before any space exists, so most of it
 * is dead on arrival; `asyncModelRun` discards those silently, which made runs look far longer
 * than they were. Filtering here instead means `limit` bounds what executes rather than what was
 * generated, and the plan can be recorded before any process starts.
 */
export const simulate = (commands: readonly Command[], model: Model, limit = Number.MAX_SAFE_INTEGER): Command[] => {
  const executable: Command[] = [];
  for (const command of commands) {
    if (executable.length >= limit) {
      break;
    }
    if (!canRun(command, model)) {
      continue;
    }
    advance(command, model);
    executable.push(command);
  }
  return executable;
};

const performJoins = async (real: Real, joins: Transition['joins']): Promise<void> => {
  for (const { client, space } of joins) {
    await real.replicants[client].brain.joinSpace({ invitationCode: real.invitationCodes[space] });
  }
};

/**
 * Block until the sibling devices the model just credited with a space actually hold it.
 *
 * The model credits them the moment their identity joins, because that is what HALO replication
 * promises; waiting here is what turns a broken promise into a failure at the command that made
 * it, rather than an unexplained timeout several commands later.
 */
const settleLearned = async (real: Real, learned: Transition['learned']): Promise<void> => {
  const bySpace = new Map<number, ClientIndex[]>();
  for (const { client, space } of learned) {
    bySpace.set(space, [...(bySpace.get(space) ?? []), client]);
  }
  for (const [space, clients] of bySpace) {
    await awaitSpaceOnAllDevices(real, space, clients);
  }
};

/**
 * Advances model and system together. The model moves first and hands over its decisions, so the
 * two cannot pick different slots or tokens; a throw ends the run, so the brief window where the
 * model leads the fleet is never observed.
 */
export const execute = async (command: Command, model: Model, real: Real): Promise<void> => {
  // Thrown before any model or system mutation, so the two never diverge on a budget stop.
  if (Date.now() > real.deadline) {
    throw new BudgetExhausted();
  }
  real.counters.commands++;
  real.trace({ seq: real.counters.commands, ...command });

  const transition = advance(command, model);
  const brain = real.replicants[command._tag === 'Checkpoint' ? 0 : command.client].brain;

  switch (command._tag) {
    case 'GoOffline': {
      await brain.goOffline();
      break;
    }

    case 'GoOnline': {
      await brain.goOnline();
      await performJoins(real, transition.joins);
      break;
    }

    case 'Restart': {
      await brain.restart();
      await performJoins(real, transition.joins);
      break;
    }

    case 'CreateSpace': {
      const slot = transition.spaceSlot;
      invariant(slot !== undefined, 'the model decided no space slot');
      const { spaceId } = await brain.createSpace({ label: `edge-stress-space-${slot}` });
      const { invitationCode } = await brain.shareSpace({ spaceId });
      real.spaceIds[slot] = spaceId;
      real.invitationCodes[slot] = invitationCode;
      await performJoins(real, transition.joins);
      break;
    }

    case 'JoinSpace': {
      await performJoins(real, transition.joins);
      break;
    }

    case 'CreateDocument': {
      const slot = transition.documentSlot;
      invariant(slot !== undefined, 'the model decided no document slot');
      real.counters.documents++;
      await brain.createDocument({
        spaceId: real.spaceIds[command.space],
        docId: documentId(command.space, slot),
        counterSlots: model.clients.length,
      });
      break;
    }

    case 'EditText': {
      const { token: value } = transition;
      invariant(value !== undefined, 'the model minted no token');
      real.trace({ seq: real.counters.commands, detail: 'token', token: value });
      await brain.editDocumentText({
        spaceId: real.spaceIds[command.space],
        docId: documentId(command.space, command.document),
        token: value,
        positionRatio: command.position,
      });
      break;
    }

    case 'EditCounter': {
      await brain.editDocumentCounter({
        spaceId: real.spaceIds[command.space],
        docId: documentId(command.space, command.document),
        slot: command.client,
      });
      break;
    }

    case 'DeleteDocument': {
      await brain.deleteDocument({
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

  await settleLearned(real, transition.learned);
};

export const describe = (command: Command): string => {
  const { _tag, ...args } = command;
  const values = Object.values(args);
  return values.length > 0 ? `${_tag}(${values.join(', ')})` : `${_tag}()`;
};
