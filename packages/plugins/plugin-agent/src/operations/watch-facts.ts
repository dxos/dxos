//
// Copyright 2026 DXOS.org
//

import * as DateTime from 'effect/DateTime';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { EntityId } from '@dxos/keys';
import { Organization, Person } from '@dxos/types';

import { Goal, type Trigger, TriggerOperation } from '#types';

import { triggerRegistry } from '../triggers.ts';
import { AgentOperationError } from './errors.ts';

const handler: Operation.WithHandler<typeof TriggerOperation.WatchFacts> = TriggerOperation.WatchFacts.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      agent: agentRef,
      requester: requesterRef,
      outcome,
      goal: goalRef,
      when,
      message,
      recipient,
      ongoing,
    }) {
      const agent = yield* Database.load(agentRef);
      const requester = yield* Database.load(requesterRef);
      // The schema cannot express a Person | Organization ref, so the constraint is checked here.
      if (!Obj.instanceOf(Person.Person, requester) && !Obj.instanceOf(Organization.Organization, requester)) {
        return yield* Effect.fail(
          new AgentOperationError({ message: 'The requester must be a person or organization; resolve them first.' }),
        );
      }

      const goal = goalRef
        ? yield* Database.load(goalRef)
        : outcome
          ? // Asked for by its owner, so it is live at once rather than proposed.
            yield* Database.add(
              Goal.make({
                title: outcome,
                horizon: 'now',
                status: 'active',
                owners: [Ref.make<Obj.Unknown>(requester)],
              }),
            )
          : undefined;
      if (!goal) {
        return yield* Effect.fail(
          new AgentOperationError({ message: 'Pass the outcome the requester wants, or the goal it serves.' }),
        );
      }

      const trigger: Trigger.Trigger = {
        id: EntityId.random(),
        agent: agent.id,
        goal: Ref.make(goal),
        when,
        then: { _tag: 'notify', recipient: recipient ?? requesterRef, message },
        ...(ongoing ? { ongoing } : {}),
        createdAt: DateTime.formatIso(yield* DateTime.now),
      };
      triggerRegistry.add(trigger);
      yield* Database.flush();
      return { trigger: trigger.id, goal: Ref.make(goal) };
    }),
  ),
);

export default handler;
