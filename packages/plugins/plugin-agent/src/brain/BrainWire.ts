//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Agent from '@dxos/assistant/Agent';
import { Database, Obj } from '@dxos/echo';
import { RDF } from '@dxos/pipeline-rdf';

import { AgentPresence, BrainService, Trigger } from '#types';

/**
 * The key EDGE serves an agent's brain under to a plugin bundle. Every call crosses as plain data in the invocation's
 * space: triggers and events as the JSON strings {@link BrainService.encodeTrigger} and
 * {@link BrainService.encodeEvent} write, which only this plugin's schemas turn back into refs.
 */
export const KEY = '@dxos/plugin-agent/BrainWire';

const OptionalString = Schema.UndefinedOr(Schema.String);
const Strings = Schema.Array(Schema.String);

/**
 * {@link BrainService.Service} over the brain EDGE serves under {@link KEY}: the same calls operation-service makes
 * over its `BRAIN_SERVICE` binding, made from inside the bundle so the plugin's own codecs run.
 */
export const make = (wire: Capabilities.HostServiceProxy): BrainService.Service => {
  const send = (method: string, ...args: readonly unknown[]): Effect.Effect<unknown, BrainService.BrainError> => {
    const call = wire[method];
    return call === undefined
      ? Effect.fail(new BrainService.BrainError({ message: `EDGE serves no brain call ${method}.` }))
      : call(...args).pipe(Effect.mapError((cause) => new BrainService.BrainError({ message: cause.message, cause })));
  };

  const decoded = <A>(schema: Schema.Codec<A, unknown>, method: string, ...args: readonly unknown[]) =>
    send(method, ...args).pipe(
      Effect.flatMap((value) => Schema.decodeUnknownEffect(schema)(value)),
      Effect.mapError((cause) =>
        cause instanceof BrainService.BrainError
          ? cause
          : new BrainService.BrainError({ message: `EDGE answered ${method} with something unexpected.`, cause }),
      ),
    );

  /** Decodes each JSON string with `decode`, which throws on a value its schema rejects. */
  const decodedEach = <A>(method: string, decode: (json: unknown) => A, ...args: readonly unknown[]) =>
    decoded(Strings, method, ...args).pipe(
      Effect.flatMap((listed) =>
        Effect.try({
          try: () => listed.map((json) => decode(JSON.parse(json))),
          catch: (cause) =>
            new BrainService.BrainError({ message: `EDGE answered ${method} with a bad entry.`, cause }),
        }),
      ),
    );

  /** The agent a subscription belongs to: subscription ids name it ({@link Trigger.makeId}). */
  const onAgent = <A>(
    id: string,
    fallback: A,
    action: (agent: string) => Effect.Effect<A, BrainService.BrainError>,
  ): Effect.Effect<A, BrainService.BrainError> => {
    const agent = Trigger.agentOf(id);
    return agent === undefined ? Effect.succeed(fallback) : action(agent);
  };

  return {
    // Facts read from ECHO carry live array proxies; JSON is the plain data a wire copies.
    push: (agent, facts, options) =>
      decoded(Schema.Number, 'push', agent, JSON.parse(JSON.stringify(facts)), {
        quiet: options?.quiet ?? [],
        ...(options?.read ? { read: options.read } : {}),
      }),
    tick: (agent) => decoded(Schema.Number, 'tick', agent),
    nextDueAt: (agent) => decoded(OptionalString, 'nextDueAt', agent),
    query: (agent, query) =>
      decoded(Schema.Array(RDF.Fact), 'query', agent, query).pipe(Effect.map((facts) => [...facts])),
    readThrough: (agent, source) => decoded(OptionalString, 'readThrough', agent, source),
    reset: (agent) => send('reset', agent).pipe(Effect.asVoid),
    // The brain evaluates rules only; a trigger without them gets its pattern translated here.
    subscribe: (subscription) =>
      decoded(
        Schema.Boolean,
        'subscribe',
        subscription.agent,
        JSON.stringify(BrainService.encodeTrigger({ ...subscription, rules: Trigger.rulesOf(subscription) })),
      ),
    subscriptions: (agent) => decodedEach('subscriptions', BrainService.decodeTrigger, agent),
    unsubscribe: (id) => onAgent(id, false, (agent) => decoded(Schema.Boolean, 'unsubscribe', agent, id)),
    take: (id) => onAgent(id, [], (agent) => decodedEach('take', BrainService.decodeEvent, agent, id)),
    ack: (id, events) => onAgent(id, undefined, (agent) => send('ack', agent, id, [...events]).pipe(Effect.asVoid)),
    wake: Effect.fnUntraced(function* ({ chat, prompt, sender }) {
      const feed = yield* Database.load(chat.feed).pipe(
        Effect.mapError((cause) => new BrainService.BrainError({ message: 'The chat has no feed.', cause })),
      );
      // Routed to the agent's brain, so one agent's wakes run in order.
      const parent = Obj.getParent(chat);
      const agent = Obj.instanceOf(Agent.Agent, parent) ? AgentPresence.brainId(parent) : (parent?.id ?? chat.id);
      yield* send('wake', agent, {
        chat: Obj.getURI(chat),
        feed: Obj.getURI(feed),
        input: {
          // A synthetic note, so the woken chat renders it as a system message.
          prompt: JSON.parse(JSON.stringify(BrainService.wakeBlocks(prompt))),
          ...(sender?.name ? { sender: { name: sender.name } } : {}),
        },
      });
    }),
  };
};
