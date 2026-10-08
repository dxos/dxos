//
// Copyright 2026 DXOS.org
//

import * as DateTime from 'effect/DateTime';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { type Space } from '@dxos/halo';
import { Organization, Person } from '@dxos/types';

import { BrainService, Goal, Profile, Trigger, TriggerOperation } from '#types';

import { compileGoal } from './compile-goal.ts';
import { AgentOperationError } from './errors.ts';
import { loadMembers, memberByDid, memberByName, membersNamed, personDid } from './members.ts';

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

      const members = yield* loadMembers;
      const resolved = resolvePattern(members, when);
      if (typeof resolved === 'string') {
        return yield* Effect.fail(new AgentOperationError({ message: resolved }));
      }

      const createdAt = DateTime.formatIso(yield* DateTime.now);
      // The goal's text compiled to rules is the authority; the pattern, translated, is the fallback.
      const compiled = yield* compileGoal({
        goal: request ?? goal.title,
        owner: personDid(requester) ?? Profile.displayName(requester),
        people: members.flatMap(({ did, displayName }) =>
          did !== undefined && displayName !== undefined ? [{ name: displayName, id: did }] : [],
        ),
        now: createdAt,
      });
      const rules = compiled?.rules ?? Trigger.toRules(resolved, { createdAt });
      const trigger: Trigger.Trigger = {
        id: Trigger.makeId(agent.id),
        agent: agent.id,
        goal: Ref.make(goal),
        ...(request ? { request } : {}),
        when: resolved,
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

/** A member named by DID or by name. */
const memberOf = (members: readonly Space.Member[], name: string): Space.Member | undefined =>
  memberByDid(members, name) ?? memberByName(members, name);

/**
 * The pattern with its speaker (and a subject that names someone) replaced by the member's id, which is what
 * facts are attributed to. A speaker who is no member stays a bare name, as `readSource` attributes their words;
 * a name several members go by is a message for the model, since matching it as words would fire on any of them.
 */
const resolvePattern = (members: readonly Space.Member[], when: Trigger.FactPattern): Trigger.FactPattern | string => {
  const ambiguous = [when.speaker, when.subject].find(
    (name) => name !== undefined && membersNamed(members, name) > 1 && !memberByDid(members, name),
  );
  if (ambiguous !== undefined) {
    return `More than one member of the space goes by "${ambiguous}"; use the name they are listed under in the space.`;
  }
  const speaker = when.speaker === undefined ? undefined : memberOf(members, when.speaker)?.did;
  const subject = when.subject === undefined ? undefined : memberOf(members, when.subject)?.did;
  return { ...when, ...(speaker ? { speaker } : {}), ...(subject ? { subject } : {}) };
};

const registryFull = () =>
  new AgentOperationError({
    message: `Already watching for ${BrainService.MAX_TRIGGERS} things; cancel a watch before adding another.`,
  });
