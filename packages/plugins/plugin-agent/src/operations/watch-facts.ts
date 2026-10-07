//
// Copyright 2026 DXOS.org
//

import * as DateTime from 'effect/DateTime';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { Organization, Person } from '@dxos/types';

import { BrainService, Goal, Profile, Trigger, TriggerOperation } from '#types';

import { compileGoal } from './compile-goal.ts';
import { AgentOperationError } from './errors.ts';
import * as Identity from './identity.ts';

const handler: Operation.WithHandler<typeof TriggerOperation.WatchFacts> = TriggerOperation.WatchFacts.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      agent: agentRef,
      requester: requesterRef,
      request,
      outcome,
      goal: goalRef,
      when,
      message,
      recipient,
      ongoing,
    }) {
      const brain = yield* BrainService.BrainService;
      const agent = yield* Database.load(agentRef);
      if ((yield* brain.subscriptions(agent.id)).length >= BrainService.MAX_TRIGGERS) {
        return yield* Effect.fail(registryFull());
      }
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

      const createdAt = DateTime.formatIso(yield* DateTime.now);
      // People named in the pattern are matched by identity DID, as `readSource` attributes their words.
      const roster = yield* Identity.loadRoster;
      // The goal's text compiled to rules is the authority; the pattern, translated, is the fallback.
      const compiled = yield* compileGoal({
        goal: request ?? goal.title,
        owner: Identity.identityOf(requester) ?? Identity.slug(Profile.displayName(requester)),
        people: [...roster.names].map(([id, name]) => ({ name, id })),
        now: createdAt,
      });
      const rules =
        compiled?.rules ??
        Trigger.toRules(when, { createdAt, person: (name) => roster.byName.get(Identity.slug(name)) });
      const trigger: Trigger.Trigger = {
        id: Trigger.makeId(agent.id),
        agent: agent.id,
        goal: Ref.make(goal),
        ...(request ? { request } : {}),
        when,
        then: { _tag: 'notify', recipient: recipient ?? requesterRef, message },
        ...(ongoing ? { ongoing } : {}),
        rules,
        createdAt,
      };
      if (!(yield* brain.subscribe(trigger))) {
        return yield* Effect.fail(registryFull());
      }
      yield* Database.flush();
      return { trigger: trigger.id, goal: Ref.make(goal) };
    }),
  ),
);

export default handler;

const registryFull = () =>
  new AgentOperationError({
    message: `Already watching for ${BrainService.MAX_TRIGGERS} things; cancel a watch before adding another.`,
  });
