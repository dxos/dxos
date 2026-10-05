//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Agent from '@dxos/assistant/Agent';
import { Database, Filter, Obj } from '@dxos/echo';
import { Organization, Person, TaskSet } from '@dxos/types';

import { AgentOperationError } from './errors.ts';

/**
 * The agent's own task list, created on first use and parented to the agent so it cascades with it.
 * A child-of filter rather than `.children()`, which EDGE's query planner cannot run.
 */
export const ensureAgentTaskSet = (agent: Agent.Agent): Effect.Effect<TaskSet.TaskSet, never, Database.Service> =>
  Effect.gen(function* () {
    const existing = yield* Database.query(Filter.and(Filter.type(TaskSet.TaskSet), Filter.childOf(agent))).run;
    const found = existing.sort((left, right) => left.id.localeCompare(right.id)).at(0);
    if (found) {
      return found;
    }
    return yield* Database.add(TaskSet.make({ name: `${agent.name ?? 'Agent'} tasks`, [Obj.Parent]: agent }));
  }).pipe(Effect.orDie);

/** A person or organization to relay to, or an error the agent can act on. */
export const asParty = (
  object: Obj.Unknown,
): Effect.Effect<Person.Person | Organization.Organization, AgentOperationError> =>
  Obj.instanceOf(Person.Person, object) || Obj.instanceOf(Organization.Organization, object)
    ? Effect.succeed(object)
    : Effect.fail(
        new AgentOperationError({ message: 'The recipient must be a person or organization; resolve it first.' }),
      );

/** The name a person or organization is addressed by. */
export const partyName = (party: Person.Person | Organization.Organization): string =>
  Obj.instanceOf(Person.Person, party)
    ? (party.preferredName ?? party.fullName ?? 'someone')
    : (party.name ?? 'an organization');
