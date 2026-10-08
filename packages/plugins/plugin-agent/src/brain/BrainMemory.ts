//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Agent from '@dxos/assistant/Agent';
import * as Evaluator from '@dxos/brain/Evaluator';
import * as AgentService from '@dxos/compute/AgentService';
import { type FactStoreApi, FactStoreLive, type RDF } from '@dxos/pipeline-rdf';

import { BrainService, Trigger } from '#types';

import { TriggerRegistry } from '../triggers.ts';

/** An in-memory brain plus the stores behind it, which the UI reads directly. */
export type BrainMemory = {
  readonly service: BrainService.Service;
  readonly triggers: TriggerRegistry;
  /** The agent's fact store, created on first use. */
  readonly facts: (agent: string) => FactStoreApi;
};

/**
 * What a brain keeps between calls. Brains made over the same state (each with its own host's agents)
 * see the same facts, subscriptions and outboxes.
 */
export type State = {
  /** The trigger store; shared with the UI that lists it. */
  readonly triggers: TriggerRegistry;
  /** Fact stores by agent id. */
  readonly stores: Map<string, FactStoreApi>;
  /** Rule evaluators by agent id. */
  readonly evaluators: Map<string, Evaluator.Evaluator>;
  /** Unacknowledged events by subscription id, in the order they were queued. */
  readonly outboxes: Map<string, BrainService.Event[]>;
  /** Event ids each subscription has queued, acknowledged or not, so a wake re-derived queues nothing. */
  readonly queued: Map<string, Set<string>>;
};

export const makeState = ({
  triggers = new TriggerRegistry(),
  stores = new Map(),
}: { triggers?: TriggerRegistry; stores?: Map<string, FactStoreApi> } = {}): State => ({
  triggers,
  stores,
  evaluators: new Map(),
  outboxes: new Map(),
  queued: new Map(),
});

export type MakeOptions = {
  /** Shared state; a fresh one by default. */
  state?: State;
  /** The clock (epoch ms); tests pin it. */
  now?: () => number;
};

/**
 * Most event ids one subscription remembers as queued, and most events its outbox holds: an ongoing watch
 * queues without end, so past this the oldest are forgotten (a re-pushed fact that old may queue again).
 */
export const MAX_EVENTS = 10_000;

/** Adds to an insertion-ordered set, dropping the oldest entries past `max`. */
const remember = (set: Set<string>, value: string, max: number): void => {
  set.add(value);
  for (const oldest of set) {
    if (set.size <= max) {
      break;
    }
    set.delete(oldest);
  }
};

const toError = (cause: unknown) =>
  new BrainService.BrainError({ message: cause instanceof Error ? cause.message : String(cause), cause });

/**
 * A brain held in process memory: pipeline-rdf's in-memory RDF store per agent, the trigger registry as
 * its subscriptions, a `@dxos/brain` evaluator per agent deciding which subscriptions wake, and an outbox
 * per subscription. Nothing survives a reload. Waking a chat submits the prompt to its session through
 * `agents`, which runs the turn locally or on EDGE as the session was opened.
 */
export const make = (
  agents: AgentService.Service,
  { state = makeState(), now = Date.now }: MakeOptions = {},
): BrainMemory => {
  const { triggers, stores, evaluators, outboxes, queued } = state;

  const facts = (agent: string): FactStoreApi => {
    let store = stores.get(agent);
    if (!store) {
      store = FactStoreLive.makeMemory();
      stores.set(agent, store);
    }
    return store;
  };

  const evaluator = (agent: string): Evaluator.Evaluator => {
    let held = evaluators.get(agent);
    if (!held) {
      held = Evaluator.make();
      evaluators.set(agent, held);
    }
    return held;
  };

  /** Queues the events not queued before; returns how many were new. */
  const enqueue = (events: readonly Evaluator.Event[]): number => {
    let count = 0;
    // Appended once per subscription, so a burst of events copies each outbox once.
    const additions = new Map<string, BrainService.Event[]>();
    for (const event of events) {
      const seen = queued.get(event.subscription) ?? new Set<string>();
      queued.set(event.subscription, seen);
      if (!seen.has(event.id)) {
        remember(seen, event.id, MAX_EVENTS);
        const added = additions.get(event.subscription) ?? [];
        added.push(BrainService.fromEvaluator(event));
        additions.set(event.subscription, added);
        count++;
      }
    }
    for (const [subscription, added] of additions) {
      outboxes.set(subscription, [...(outboxes.get(subscription) ?? []), ...added].slice(-MAX_EVENTS));
    }
    return count;
  };

  const service: BrainService.Service = {
    push: (agent, entries, options) =>
      facts(agent)
        .putFacts(entries)
        .pipe(
          Effect.mapError(toError),
          Effect.map(() => enqueue(evaluator(agent).push(entries, { at: now(), quiet: options?.quiet }))),
        ),
    tick: (agent) => Effect.sync(() => enqueue(evaluator(agent).tick(now()))),
    nextDueAt: (agent) =>
      Effect.sync(() => {
        const due = evaluators.get(agent)?.nextDueAt();
        return due === undefined ? undefined : new Date(due).toISOString();
      }),
    query: (agent, query) =>
      facts(agent)
        .query(query)
        .pipe(
          Effect.map((found): RDF.Fact[] => found),
          Effect.mapError(toError),
        ),
    subscribe: Effect.fnUntraced(function* (trigger) {
      const held = triggers.list(trigger.agent).filter(({ id }) => id !== trigger.id);
      if (held.length >= BrainService.MAX_TRIGGERS) {
        return false;
      }
      const subscription = BrainService.toSubscription(trigger);
      const current = evaluator(trigger.agent).subscriptions.find(({ id }) => id === subscription.id);
      // Re-subscribing unchanged keeps the evaluator's state, so an achieved goal stays achieved.
      if (current?.rules !== subscription.rules || current?.createdAt !== subscription.createdAt) {
        yield* Effect.try({
          try: () => evaluator(trigger.agent).add(subscription),
          catch: toError,
        });
      }
      triggers.add(trigger);
      return true;
    }),
    subscriptions: (agent) => Effect.sync(() => triggers.list(agent)),
    unsubscribe: (id) =>
      Effect.sync(() => {
        const agent = triggers.get(id)?.agent ?? Trigger.agentOf(id);
        if (agent !== undefined) {
          evaluators.get(agent)?.remove(id);
        }
        outboxes.delete(id);
        queued.delete(id);
        return triggers.remove(id);
      }),
    take: (id) => Effect.sync(() => [...(outboxes.get(id) ?? [])]),
    ack: (id, events) =>
      Effect.sync(() => {
        const outbox = outboxes.get(id);
        if (outbox) {
          outboxes.set(
            id,
            outbox.filter((event) => !events.includes(event.id)),
          );
        }
      }),
    wake: ({ chat, prompt, sender }) =>
      agents
        // The chat's own location, else an agent chat on EDGE would wake a second, local session.
        .getSession(chat, { location: Agent.chatLocation(chat) })
        .pipe(
          Effect.flatMap((session) =>
            session.submitPrompt(BrainService.wakeBlocks(prompt), sender ? { sender } : undefined),
          ),
        ),
  };

  return { service, triggers, facts };
};

/** {@link make} as a layer over the host's `AgentService`. */
export const layer: Layer.Layer<BrainService.BrainService, never, AgentService.AgentService> = Layer.effect(
  BrainService.BrainService,
  AgentService.AgentService.pipe(Effect.map((agents) => make(agents).service)),
);
