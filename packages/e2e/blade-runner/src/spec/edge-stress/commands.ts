//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Testing from 'effect/testing';

import { invariant } from '@dxos/invariant';

import {
  type ClientIndex,
  type IdentityIndex,
  type Model,
  type ModelDocument,
  type ModelSpace,
  canAct,
  documentId,
  hasAdmittingDevice,
  holdsSpace,
  identityOf,
  liveDocument,
  resolvablePendingSpaces,
  token,
} from './model.ts';
import { BudgetExhausted, type Real, awaitSpaceOnAllDevices, runCheckpoint } from './system.ts';

//
// What the system can do. Each command below is one declaration: its arguments (the schema, which
// is also what a trace line holds and what a replayed line decodes back into), when it may run,
// what it does to the model, and what it does to the fleet.
//

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

/** What a command decides beyond the joins and learns it records through `ModelOps`. */
type Decision = Partial<Omit<Transition, 'joins' | 'learned'>>;

/** The model-side moves every command composes from; each records what it did on the transition. */
type ModelOps = {
  /** An identity joins a space through one of its devices. */
  join: (client: ClientIndex, space: number) => void;
  /** A space reaches every *online* device of a member identity; an offline one has to wait. */
  learn: (space: number, identity: IdentityIndex) => void;
  /** The precondition already guarantees the document is live; asserting says so rather than
   * asking the type-checker to take it on faith. */
  documentAt: (space: number, document: number) => ModelDocument;
};

type CommandKind =
  /** Cuts or restores a peer's link; excluded by `partitions: false`. */
  | 'partition'
  /** Changes who is in a space. */
  | 'membership'
  /** Mutates replicated state — what a plan has to reach for convergence to be tested at all. */
  | 'data'
  /** Compares peers mid-run; excluded by `checkpoints: false`. */
  | 'assertion';

type CommandSpec<C> = {
  kind: CommandKind;
  /**
   * Relative draw frequency. A uniform draw spends the whole budget before it tests anything:
   * `Restart` and `Checkpoint` are enabled from the first command while every data operation waits
   * for a space and a document, so a uniform 25-command plan reaches roughly one edit.
   */
  weight: number;
  /** The precondition. Reads the model only. */
  check: (model: Model, command: C) => boolean;
  /** The model half, with no I/O; returns what it decided beyond the joins and learns it recorded. */
  advance: (model: Model, command: C, ops: ModelOps) => Decision;
  /** The system half, driven by the transition so it cannot pick differently from the model. */
  run: (real: Real, command: C, transition: Transition, model: Model) => Promise<void>;
};

/** Binds a command's arguments to its semantics, so one value describes the whole operation. */
const command = <Tag extends string, Fields extends Schema.Struct.Fields>(
  tag: Tag,
  fields: Fields,
  spec: CommandSpec<Schema.TaggedStruct<Tag, Fields>['Type']>,
) => ({ ...spec, schema: Schema.TaggedStruct(tag, fields) });

// Each slot is its own schema instance so the generator can tell them apart by identity; the
// fleet shape that bounds them is a run-time parameter of generation, not of the type.
const ClientSlot = Schema.Int.annotate({ identifier: 'ClientSlot' });
const SpaceSlot = Schema.Int.annotate({ identifier: 'SpaceSlot' });
const DocumentSlot = Schema.Int.annotate({ identifier: 'DocumentSlot' });
// Boundary-heavy on purpose: concurrent inserts at the same offset are what exercise text merge.
const Position = Schema.Literals([0, 0.25, 0.5, 0.75, 0.999]);

const brainOf = (real: Real, client: ClientIndex) => real.replicants[client].brain;

const decided = <T>(value: T | undefined, what: string): T => {
  invariant(value !== undefined, `the model decided no ${what}`);
  return value;
};

/** Back online, a device joins what it can and catches up on every space its identity already has. */
const catchUp = (model: Model, client: ClientIndex, { join, learn }: ModelOps): Decision => {
  for (const slot of resolvablePendingSpaces(model, client)) {
    join(client, slot);
  }
  const identity = identityOf(model, client);
  model.spaces.forEach((space, slot) => {
    if (space.members.has(identity)) {
      learn(slot, identity);
    }
  });
  return {};
};

export const GoOffline = command(
  'GoOffline',
  { client: ClientSlot },
  {
    kind: 'partition',
    weight: 3,
    check: (model, { client }) => model.clients[client].state === 'online',
    advance: (model, { client }) => {
      model.clients[client].state = 'offline';
      return {};
    },
    run: async (real, { client }) => {
      await brainOf(real, client).goOffline();
    },
  },
);

export const GoOnline = command(
  'GoOnline',
  { client: ClientSlot },
  {
    kind: 'partition',
    weight: 3,
    check: (model, { client }) => model.clients[client].state === 'offline',
    advance: (model, { client }, ops) => {
      model.clients[client].state = 'online';
      return catchUp(model, client, ops);
    },
    run: async (real, { client }) => {
      await brainOf(real, client).goOnline();
    },
  },
);

export const Restart = command(
  'Restart',
  { client: ClientSlot },
  {
    kind: 'partition',
    weight: 2,
    check: (model, { client }) => model.clients[client].state !== 'down',
    advance: (model, { client }, ops) => {
      model.clients[client].state = 'online';
      return catchUp(model, client, ops);
    },
    run: async (real, { client }) => {
      await brainOf(real, client).restart();
    },
  },
);

export const CreateSpace = command(
  'CreateSpace',
  { client: ClientSlot },
  {
    kind: 'membership',
    weight: 3,
    check: (model, { client }) =>
      model.clients[client].state === 'online' && model.spaces.length < model.limits.maxSpaces,
    advance: (model, { client }, { join, learn }) => {
      const creator = identityOf(model, client);
      const spaceSlot = model.spaces.length;
      const space: ModelSpace = {
        members: new Set([creator]),
        pending: new Set(model.identities.map((_, index) => index).filter((index) => index !== creator)),
        knownBy: new Set([client]),
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
      return { spaceSlot };
    },
    run: async (real, { client }, transition) => {
      const slot = decided(transition.spaceSlot, 'space slot');
      const brain = brainOf(real, client);
      const { spaceId } = await brain.createSpace({ label: `edge-stress-space-${slot}` });
      const { invitationCode } = await brain.shareSpace({ spaceId });
      real.spaceIds[slot] = spaceId;
      real.invitationCodes[slot] = invitationCode;
      real.spaceOwners[slot] = client;
      // The real id goes into the trace the moment it exists: a run that dies before its own
      // cleanup leaves an artifact a sweeper can act on (scripts/sweep-edge-stress.mjs).
      real.trace({ seq: real.counters.commands, detail: 'spaceId', spaceId });
    },
  },
);

export const JoinSpace = command(
  'JoinSpace',
  { client: ClientSlot, space: SpaceSlot },
  {
    kind: 'membership',
    weight: 3,
    check: (model, { client, space }) =>
      model.clients[client].state === 'online' &&
      space < model.spaces.length &&
      model.spaces[space].pending.has(identityOf(model, client)) &&
      hasAdmittingDevice(model, space),
    advance: (_model, { client, space }, { join }) => {
      join(client, space);
      return {};
    },
    // The join itself is a consequence of the transition, performed by `execute` for every command.
    run: async () => {},
  },
);

export const CreateDocument = command(
  'CreateDocument',
  { client: ClientSlot, space: SpaceSlot },
  {
    kind: 'data',
    weight: 4,
    check: (model, { client, space }) =>
      canAct(model, client) &&
      space < model.spaces.length &&
      holdsSpace(model, client, space) &&
      model.spaces[space].documents.length < model.limits.maxDocumentsPerSpace,
    advance: (model, { space }) => {
      const documents = model.spaces[space].documents;
      const documentSlot = documents.length;
      documents.push({ deleted: false, tokens: new Set(), counters: new Map() });
      return { documentSlot };
    },
    run: async (real, { client, space }, transition) => {
      real.counters.documents++;
      await brainOf(real, client).createDocument({
        spaceId: real.spaceIds[space],
        docId: documentId(space, decided(transition.documentSlot, 'document slot')),
        counterSlots: real.replicants.length,
      });
    },
  },
);

export const EditText = command(
  'EditText',
  { client: ClientSlot, space: SpaceSlot, document: DocumentSlot, position: Position },
  {
    kind: 'data',
    weight: 8,
    check: (model, { client, space, document }) =>
      canAct(model, client) && holdsSpace(model, client, space) && liveDocument(model, space, document) !== undefined,
    advance: (model, { client, space, document }, { documentAt }) => {
      const value = token(client, ++model.opSeq);
      documentAt(space, document).tokens.add(value);
      return { token: value };
    },
    run: async (real, { client, space, document, position }, transition) => {
      const value = decided(transition.token, 'token');
      real.trace({ seq: real.counters.commands, detail: 'token', token: value });
      await brainOf(real, client).editDocumentText({
        spaceId: real.spaceIds[space],
        docId: documentId(space, document),
        token: value,
        positionRatio: position,
      });
    },
  },
);

export const EditCounter = command(
  'EditCounter',
  { client: ClientSlot, space: SpaceSlot, document: DocumentSlot },
  {
    kind: 'data',
    weight: 5,
    check: (model, { client, space, document }) =>
      canAct(model, client) && holdsSpace(model, client, space) && liveDocument(model, space, document) !== undefined,
    advance: (_model, { client, space, document }, { documentAt }) => {
      const counters = documentAt(space, document).counters;
      counters.set(client, (counters.get(client) ?? 0) + 1);
      return {};
    },
    run: async (real, { client, space, document }) => {
      await brainOf(real, client).editDocumentCounter({
        spaceId: real.spaceIds[space],
        docId: documentId(space, document),
        slot: client,
      });
    },
  },
);

export const DeleteDocument = command(
  'DeleteDocument',
  { client: ClientSlot, space: SpaceSlot, document: DocumentSlot },
  {
    kind: 'data',
    // Rare: a deleted slot still counts against `maxDocumentsPerSpace`, so frequent deletes starve
    // the run of anything to edit.
    weight: 1,
    check: (model, { client, space, document }) =>
      canAct(model, client) && holdsSpace(model, client, space) && liveDocument(model, space, document) !== undefined,
    advance: (_model, { space, document }, { documentAt }) => {
      documentAt(space, document).deleted = true;
      return {};
    },
    run: async (real, { client, space, document }) => {
      await brainOf(real, client).deleteDocument({
        spaceId: real.spaceIds[space],
        docId: documentId(space, document),
      });
    },
  },
);

export const Checkpoint = command(
  'Checkpoint',
  {},
  {
    kind: 'assertion',
    weight: 2,
    check: (model) => model.clients.some((client) => client.state === 'online'),
    advance: () => ({}),
    run: (real, _command, _transition, model) => runCheckpoint(model, real),
  },
);

// Listed rather than derived from `COMMANDS`: TypeScript takes a precise union type only from a
// tuple, and this is where `Command` gets its type from.
export const Command = Schema.Union([
  GoOffline.schema,
  GoOnline.schema,
  Restart.schema,
  CreateSpace.schema,
  JoinSpace.schema,
  CreateDocument.schema,
  EditText.schema,
  EditCounter.schema,
  DeleteDocument.schema,
  Checkpoint.schema,
]);
export type Command = typeof Command.Type;

type Tag = Command['_tag'];
type CommandOf<T extends Tag> = Extract<Command, { _tag: T }>;

// Keyed by tag so a command can be looked up by what a trace line or a drawn value carries; the
// annotation is what lets the dispatchers below stay generic over the tag without a cast.
export const COMMANDS: {
  [T in Tag]: CommandSpec<CommandOf<T>> & { readonly schema: { readonly fields: Schema.Struct.Fields } };
} = {
  GoOffline,
  GoOnline,
  Restart,
  CreateSpace,
  JoinSpace,
  CreateDocument,
  EditText,
  EditCounter,
  DeleteDocument,
  Checkpoint,
};

//
// Dispatch. The declarations above are the only place a command is interpreted.
//

const specOf = <T extends Tag>(tag: T): CommandSpec<CommandOf<T>> => COMMANDS[tag];

/** Slots are plain integers, so a plan replayed against a smaller fleet must not index past it. */
const addressesFleet = (command: Command, model: Model): boolean =>
  !('client' in command) || model.clients[command.client] !== undefined;

/** The precondition. Reads the model only, which is what makes a sequence simulable. */
export const canRun = <T extends Tag>(command: CommandOf<T>, model: Model): boolean =>
  addressesFleet(command, model) && specOf(command._tag).check(model, command);

/**
 * The model half of a command, in full and with no I/O.
 *
 * Separating it is what makes a sequence simulable: `plan.ts` runs this against a throwaway model
 * to learn which commands will survive their preconditions, so the recorded plan is what executes
 * rather than what was drawn.
 */
export const advance = <T extends Tag>(command: CommandOf<T>, model: Model): Transition => {
  const transition: Transition = { joins: [], learned: [] };
  const ops: ModelOps = {
    learn: (space, identity) => {
      for (const device of model.identities[identity].devices) {
        if (model.clients[device].state === 'online' && !model.spaces[space].knownBy.has(device)) {
          model.spaces[space].knownBy.add(device);
          transition.learned.push({ client: device, space });
        }
      }
    },
    join: (client, space) => {
      const identity = identityOf(model, client);
      model.spaces[space].pending.delete(identity);
      model.spaces[space].members.add(identity);
      model.spaces[space].knownBy.add(client);
      transition.joins.push({ client, space });
      ops.learn(space, identity);
    },
    documentAt: (space, document) => {
      const found = liveDocument(model, space, document);
      invariant(found, `no live document ${space}/${document}`);
      return found;
    },
  };
  return { ...transition, ...specOf(command._tag).advance(model, command, ops) };
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
export const execute = async <T extends Tag>(command: CommandOf<T>, model: Model, real: Real): Promise<void> => {
  // Thrown before any model or system mutation, so the two never diverge on a budget stop.
  if (Date.now() > real.deadline) {
    throw new BudgetExhausted();
  }
  real.counters.commands++;
  real.trace({ seq: real.counters.commands, ...command });

  const transition = advance(command, model);
  await specOf(command._tag).run(real, command, transition, model);
  // Joins and HALO propagation are consequences of the transition, not of any one command.
  for (const { client, space } of transition.joins) {
    await brainOf(real, client).joinSpace({ invitationCode: real.invitationCodes[space] });
  }
  await settleLearned(real, transition.learned);
};

export const describe = (command: Command): string => {
  const { _tag, ...args } = command;
  const values = Object.values(args);
  return values.length > 0 ? `${_tag}(${values.join(', ')})` : `${_tag}()`;
};

export const mutatesData = (command: Command): boolean => specOf(command._tag).kind === 'data';

//
// Generation. Parameterized by fleet shape; everything else comes from the declarations above.
//

export type FleetShape = { clients: number; spaces: number; documents: number };

/**
 * The weighted generator over the whole vocabulary.
 *
 * Each command's arbitrary is built from its own declared fields, with the three slot schemas
 * bound to the fleet shape and everything else derived from the schema; the result is decoded
 * through `Command`, so a generated value that the declaration would not accept cannot exist.
 */
export const makeCommandArbitrary = ({
  checkpoints,
  partitions,
  ...shape
}: FleetShape & { checkpoints: boolean; partitions: boolean }): Testing.FastCheck.Arbitrary<Command> => {
  // Uniform over the slots, as the literal unions were: `integer` biases toward small values,
  // which would crowd draws onto slot 0 instead of colliding across the whole fleet.
  const slots = (count: number) =>
    Testing.FastCheck.constantFrom(...Array.from({ length: Math.max(count, 1) }, (_, index) => index));
  const bounded = new Map<unknown, Testing.FastCheck.Arbitrary<unknown>>([
    [ClientSlot, slots(shape.clients)],
    [SpaceSlot, slots(shape.spaces)],
    [DocumentSlot, slots(shape.documents)],
  ]);
  const decode = Schema.decodeUnknownSync(Command);
  const members = Object.values(COMMANDS)
    .filter(({ kind }) => (kind !== 'assertion' || checkpoints) && (kind !== 'partition' || partitions))
    .map(({ weight, schema }) => ({
      weight,
      arbitrary: Testing.FastCheck.record(
        Object.fromEntries(
          Object.entries(schema.fields).map(([name, field]) => [
            name,
            bounded.get(field) ?? Schema.toArbitrary(field)(Testing.FastCheck),
          ]),
        ),
      ).map(decode),
    }));
  return Testing.FastCheck.oneof(...members);
};
