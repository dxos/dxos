//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Harness from '@dxos/assistant/Harness';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';

import { GoalsSkill } from '#skills';
import { type FactEntry, type Goal, RelayOperation } from '#types';

import { triggerRegistry } from '../triggers.ts';
import { firstMatch } from './match-facts.ts';
import { readSource } from './read-source.ts';

/** Statuses after which a goal's triggers have nothing left to wait for. */
const CLOSED: readonly Goal.Status[] = ['achieved', 'dropped'];

/**
 * Fires the agent's triggers that `facts` match: runs each one's action, marks its goal achieved and
 * removes it. Triggers whose goal closed meanwhile are removed unfired.
 */
export const fireTriggers = Effect.fnUntraced(function* (agent: Agent.Agent, facts: readonly FactEntry.Fact[]) {
  const fired: string[] = [];
  const undelivered: string[] = [];
  for (const trigger of triggerRegistry.list(agent.id)) {
    const goal = trigger.goal
      ? yield* Database.load(trigger.goal).pipe(Effect.orElseSucceed(() => undefined))
      : undefined;
    if (goal && CLOSED.includes(goal.status)) {
      triggerRegistry.remove(trigger.id);
      continue;
    }

    // Removed before acting, so a turn ending in another chat meanwhile cannot fire it twice.
    if (!firstMatch(trigger, facts) || !triggerRegistry.remove(trigger.id)) {
      continue;
    }
    const delivery = yield* Operation.invoke(RelayOperation.SendMessage, {
      agent: Ref.make(agent),
      recipient: trigger.then.recipient,
      text: trigger.then.message,
    }).pipe(Effect.orElseSucceed(() => ({ delivered: false, reason: 'The message could not be sent.' })));
    if (!delivery.delivered) {
      undelivered.push(delivery.reason ?? 'The message could not be delivered.');
    }
    if (goal) {
      Obj.update(goal, (goal) => {
        goal.status = 'achieved';
      });
    }
    fired.push(trigger.id);
  }
  yield* Database.flush();
  return { fired, undelivered };
});

const handler: Operation.WithHandler<typeof GoalsSkill.RunTriggers> = GoalsSkill.RunTriggers.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const chat = yield* Harness.getChat.pipe(Effect.orElseSucceed(() => undefined));
      const agent = chat ? yield* Agent.loadForChat(chat) : undefined;
      // Reading costs a model call, so a turn is only read while the agent is waiting for something.
      if (!chat || !agent || triggerRegistry.list(agent.id).length === 0) {
        return { facts: 0, fired: [], undelivered: [] };
      }

      const { facts } = yield* readSource(agent, { source: chat });
      return { facts: facts.length, ...(yield* fireTriggers(agent, facts)) };
    }),
  ),
);

export default handler;
