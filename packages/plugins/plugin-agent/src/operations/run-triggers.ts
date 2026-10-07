//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { type AiService } from '@dxos/ai';
import * as Agent from '@dxos/assistant/Agent';
import * as Harness from '@dxos/assistant/Harness';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { type RDF, normalizeEntityId } from '@dxos/pipeline-rdf';

import { BrainSkill } from '#skills';
import { BrainService, FactEntry, Goal, Profile, RelayOperation, Trigger } from '#types';

import { composeUpdate } from './compose-update.ts';
import { firstMatch, matchesPattern } from './match-facts.ts';
import { agentSpeaker, readSource } from './read-source.ts';

/** Statuses after which a goal's triggers have nothing left to wait for. */
const CLOSED: readonly Goal.Status[] = ['achieved', 'dropped'];

/**
 * Fires the agent's triggers that `facts` match: sends each one's update, composed by the model from the
 * conversation `transcript` under the relay rules; a one-time trigger also marks its goal achieved and is
 * removed, an ongoing one keeps watching. Triggers whose goal closed meanwhile are removed unfired.
 *
 * Facts the agent itself stated never fire a trigger: its replies restate what it passed on, and a watch
 * matching them would wake the chat it just woke, without end.
 */
export const fireTriggers: (
  agent: Agent.Agent,
  facts: readonly RDF.Fact[],
  transcript?: string,
) => Effect.Effect<
  { fired: string[]; undelivered: string[] },
  BrainService.BrainError,
  AiService.AiService | Database.Service | Operation.Service | BrainService.BrainService
> = Effect.fnUntraced(function* (agent, allFacts, transcript) {
  const brain = yield* BrainService.BrainService;
  // The same name `readSource` attributes the agent's own messages to, unnamed agents included.
  const self = normalizeEntityId(agentSpeaker(agent));
  const facts = allFacts.filter((fact) => fact.attribution.agent !== self);
  const fired: string[] = [];
  const undelivered: string[] = [];
  if (facts.length === 0) {
    return { fired, undelivered };
  }

  for (const trigger of yield* brain.listTriggers(agent.id)) {
    const goal = trigger.goal
      ? yield* Database.resolve(trigger.goal, Goal.Goal).pipe(Effect.orElseSucceed(() => undefined))
      : undefined;
    if (goal && CLOSED.includes(goal.status)) {
      yield* brain.removeTrigger(trigger.id);
      continue;
    }

    const fact = firstMatch(trigger, facts);
    // A one-time trigger is removed before acting, so a turn ending in another chat meanwhile cannot fire it twice.
    if (!fact || (!trigger.ongoing && !(yield* brain.removeTrigger(trigger.id)))) {
      continue;
    }
    // Through the database: a trigger read back from the brain carries refs with no resolver of their own.
    // `Effect.option` because the schema-less overload still fails at runtime when the target is gone.
    const resolved = Option.getOrUndefined(yield* Database.resolve(trigger.then.recipient).pipe(Effect.option));
    const recipient = Obj.isObject(resolved) ? resolved : undefined;
    const text = yield* composeUpdate({
      agentName: agent.name ?? 'Agent',
      recipientName: recipient ? Profile.displayName(recipient) : 'the requester',
      request: trigger.request ?? goal?.title ?? trigger.then.message,
      facts: facts.filter((candidate) => matchesPattern(trigger.when, candidate, { after: trigger.createdAt })),
      transcript,
      hint: Trigger.renderMessage(trigger, fact.assertion.quote ?? FactEntry.factText(fact)),
    });
    const delivery = yield* Operation.invoke(RelayOperation.SendMessage, {
      agent: Ref.make(agent),
      recipient: recipient ? Ref.make(recipient) : trigger.then.recipient,
      text,
    }).pipe(Effect.orElseSucceed(() => ({ delivered: false, reason: 'The message could not be sent.' })));
    if (!delivery.delivered) {
      undelivered.push(delivery.reason ?? 'The message could not be delivered.');
    }
    if (goal && !trigger.ongoing) {
      Obj.update(goal, (goal) => {
        goal.status = 'achieved';
      });
    }
    fired.push(trigger.id);
  }
  yield* Database.flush();
  return { fired, undelivered };
});

const handler: Operation.WithHandler<typeof BrainSkill.RunTriggers> = BrainSkill.RunTriggers.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const chat = yield* Harness.getChat.pipe(Effect.orElseSucceed(() => undefined));
      const agent = chat ? yield* Agent.loadForChat(chat) : undefined;
      // Every turn is read, not only while a watch is waiting: recall answers from these facts too.
      if (!chat || !agent) {
        return { facts: 0, fired: [], undelivered: [] };
      }

      const { facts, transcript } = yield* readSource(agent, { source: chat });
      if (facts.length > 0) {
        const brain = yield* BrainService.BrainService;
        yield* brain.addFacts(agent.id, facts);
      }
      return { facts: facts.length, ...(yield* fireTriggers(agent, facts, transcript)) };
    }),
  ),
);

export default handler;
