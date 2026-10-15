//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { Organization, Person } from '@dxos/types';

import { AgentPresence, BrainService, Knowledge, MemoryOperation, Profile } from '#types';

import { AgentOperationError } from './errors.ts';
import { recordingAgent } from './knowledge.ts';
import { agentId } from './members.ts';

const subjectType = (entity: Obj.Unknown): Knowledge.Subject['type'] =>
  Obj.instanceOf(Person.Person, entity)
    ? 'person'
    : Obj.instanceOf(Organization.Organization, entity)
      ? 'org'
      : undefined;

const handler: Operation.WithHandler<typeof MemoryOperation.Remember> = MemoryOperation.Remember.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      agent: agentRef,
      content,
      kind,
      origin,
      subjects,
      confidence,
      source,
      supersedes,
      body,
    }) {
      if (subjects.length === 0) {
        return yield* Effect.fail(new AgentOperationError({ message: 'A memory needs at least one subject.' }));
      }
      if (confidence !== undefined && (confidence < 0 || confidence > 1)) {
        return yield* Effect.fail(new AgentOperationError({ message: 'Confidence must be between 0 and 1.' }));
      }

      const agent = yield* recordingAgent(agentRef);
      const entities = yield* Effect.forEach(subjects, (subject) => Database.load(subject));
      const id = agentId(agent);
      const facts = Knowledge.toFacts({
        content,
        kind,
        origin,
        agent: id,
        subjects: entities.map((entity) => ({
          id: Obj.getURI(entity),
          label: Profile.displayName(entity),
          type: subjectType(entity),
        })),
        ...(confidence !== undefined ? { confidence } : {}),
        ...(source ? { source: source.uri } : {}),
        ...(body !== undefined ? { body } : {}),
        // Never overwritten: the old claim stays readable as history, superseded by this one.
        ...(supersedes ? { supersedes } : {}),
      });

      // The agent's own words, so a watch never wakes on what it remembered.
      yield* (yield* BrainService.BrainService).push(AgentPresence.brainId(agent), facts, { quiet: [id] });
      return { memory: facts[0].graph ?? facts[0].id };
    }),
  ),
);

export default handler;
