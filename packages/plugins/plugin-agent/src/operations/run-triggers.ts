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
import { type RDF } from '@dxos/pipeline-rdf';

import { BrainSkill } from '#skills';
import { BrainService, FactEntry, Goal, Profile, RelayOperation, Trigger } from '#types';

import { composeUpdate } from './compose-update.ts';
import * as Identity from './identity.ts';
import { agentEntity, readSource } from './read-source.ts';

/** Statuses after which a goal's triggers have nothing left to wait for. */
const CLOSED: readonly Goal.Status[] = ['achieved', 'dropped'];

/**
 * Pushes `facts` into the agent's brain, then delivers what its subscriptions queued: each subscription
 * with events sends one update, composed by the model from those facts and the conversation `transcript`
 * under the relay rules. A one-time subscription also marks its goal achieved and is removed; an ongoing
 * one acknowledges its events and keeps watching. Subscriptions whose goal closed meanwhile are removed
 * undelivered.
 *
 * Facts the agent itself stated are stored but queue nothing: its replies restate what it passed on, and
 * a watch matching them would wake the chat it just woke, without end.
 */
export const pushFacts: (
  agent: Agent.Agent,
  facts: readonly RDF.Fact[],
  transcript?: string,
) => Effect.Effect<
  { fired: string[]; undelivered: string[] },
  BrainService.BrainError,
  AiService.AiService | Database.Service | Operation.Service | BrainService.BrainService
> = Effect.fnUntraced(function* (agent, facts, transcript) {
  const brain = yield* BrainService.BrainService;
  const fired: string[] = [];
  const undelivered: string[] = [];
  if (facts.length === 0) {
    return { fired, undelivered };
  }
  // The same entity `readSource` attributes the agent's own messages to, unnamed agents included.
  const queued = yield* brain.push(agent.id, facts, { quiet: [agentEntity(agent)] });
  if (queued === 0) {
    return { fired, undelivered };
  }
  return yield* deliver(agent, transcript);
});

/**
 * Delivers what the agent's subscriptions have queued — after a push, or after a clock tick: each
 * subscription with events sends one update, composed by the model from the facts behind its wakes
 * (and the conversation `transcript`, when a turn caused them) under the relay rules. A one-time
 * subscription also marks its goal achieved and is removed; an ongoing one acknowledges its events and
 * keeps watching. Subscriptions whose goal closed meanwhile are removed undelivered.
 */
export const deliver: (
  agent: Agent.Agent,
  transcript?: string,
) => Effect.Effect<
  { fired: string[]; undelivered: string[] },
  BrainService.BrainError,
  AiService.AiService | Database.Service | Operation.Service | BrainService.BrainService
> = Effect.fnUntraced(function* (agent, transcript) {
  const brain = yield* BrainService.BrainService;
  const fired: string[] = [];
  const undelivered: string[] = [];
  const roster = yield* Identity.loadRoster;

  for (const subscription of yield* brain.subscriptions(agent.id)) {
    const events = yield* brain.take(subscription.id);
    if (events.length === 0) {
      continue;
    }
    const goal = subscription.goal
      ? yield* Database.resolve(subscription.goal, Goal.Goal).pipe(Effect.orElseSucceed(() => undefined))
      : undefined;
    if (goal && CLOSED.includes(goal.status)) {
      yield* brain.unsubscribe(subscription.id);
      continue;
    }
    // A one-time subscription closes when its outcome happened: compiled rules say so with `achieved`,
    // a translated pattern with its single wake. Other wakes (a follow-up, a reply) pass on and keep it open.
    const closes =
      !subscription.ongoing && events.some(({ label }) => label === 'achieved' || label === Trigger.MATCH_LABEL);
    // Removed before acting, so a turn ending in another chat meanwhile cannot fire it twice.
    if (closes && !(yield* brain.unsubscribe(subscription.id))) {
      continue;
    }

    const matched = uniqueFacts(events);
    const [first] = matched;
    // Through the database: a subscription read back from the brain carries refs with no resolver of their own.
    // `Effect.option` because the schema-less overload still fails at runtime when the target is gone.
    const resolved = Option.getOrUndefined(yield* Database.resolve(subscription.then.recipient).pipe(Effect.option));
    const recipient = Obj.isObject(resolved) ? resolved : undefined;
    const text = yield* composeUpdate({
      agentName: agent.name ?? 'Agent',
      recipientName: recipient ? Profile.displayName(recipient) : 'the requester',
      request: subscription.request ?? goal?.title ?? subscription.then.message,
      facts: matched,
      transcript,
      speakerName: (entity) => Identity.displayName(roster, entity),
      hint: Trigger.renderMessage(
        subscription,
        first
          ? (first.assertion.quote ?? FactEntry.factText(first))
          : (subscription.request ?? subscription.then.message),
      ),
    });
    const delivery = yield* Operation.invoke(RelayOperation.SendMessage, {
      agent: Ref.make(agent),
      recipient: recipient ? Ref.make(recipient) : subscription.then.recipient,
      text,
    }).pipe(Effect.orElseSucceed(() => ({ delivered: false, reason: 'The message could not be sent.' })));
    if (!delivery.delivered) {
      undelivered.push(delivery.reason ?? 'The message could not be delivered.');
    }
    if (!closes) {
      // Acknowledged even when undelivered: the failure is reported to this turn, and a retry would resend on every turn.
      yield* brain.ack(
        subscription.id,
        events.map(({ id }) => id),
      );
    } else if (goal) {
      Obj.update(goal, (goal) => {
        goal.status = 'achieved';
      });
    }
    fired.push(subscription.id);
  }
  yield* Database.flush();
  return { fired, undelivered };
});

/** The facts behind the events, each once, in the order they were queued. */
const uniqueFacts = (events: readonly BrainService.Event[]): RDF.Fact[] => {
  const seen = new Map<string, RDF.Fact>();
  for (const { facts } of events) {
    for (const fact of facts) {
      seen.set(fact.id, seen.get(fact.id) ?? fact);
    }
  }
  return [...seen.values()];
};

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
      return { facts: facts.length, ...(yield* pushFacts(agent, facts, transcript)) };
    }),
  ),
);

export default handler;
