//
// Copyright 2026 DXOS.org
//

import { Schema } from 'effect';
import { FastCheck } from 'effect/testing';

import {
  type Model,
  type ModelSpace,
  documentId,
  identityOf,
  canAct,
  hasAdmittingDevice,
  isMember,
  liveDocument,
  token,
} from './model';
import { type Real, BudgetExhausted, joinPendingSpaces, joinSpace, runCheckpoint } from './system';

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

/** Advances model and system together, so a divergence is always attributable to one command. */
export const execute = async (command: Command, model: Model, real: Real): Promise<void> => {
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

export const describe = (command: Command): string => {
  const { _tag, ...args } = command;
  const values = Object.values(args);
  return values.length > 0 ? `${_tag}(${values.join(', ')})` : `${_tag}()`;
};

export const toAsyncCommand = (command: Command): FastCheck.AsyncCommand<Model, Real> => ({
  check: (model) => canRun(command, model),
  run: (model, real) => execute(command, model, real),
  toString: () => describe(command),
});
