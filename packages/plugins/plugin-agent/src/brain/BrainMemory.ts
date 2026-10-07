//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as AgentService from '@dxos/compute/AgentService';
import { type FactStoreApi, FactStoreLive, type RDF } from '@dxos/pipeline-rdf';

import { BrainService } from '#types';

import { TriggerRegistry } from '../triggers.ts';

/** An in-memory brain plus the stores behind it, which the UI reads directly. */
export type BrainMemory = {
  readonly service: BrainService.Service;
  readonly triggers: TriggerRegistry;
  /** The agent's fact store, created on first use. */
  readonly facts: (agent: string) => FactStoreApi;
};

const toError = (cause: unknown) =>
  new BrainService.BrainError({ message: cause instanceof Error ? cause.message : String(cause), cause });

/**
 * A brain held in process memory: pipeline-rdf's in-memory RDF store per agent, the trigger registry as
 * its subscriptions, and an outbox per subscription. Nothing survives a reload. Waking a chat submits the prompt to its session through
 * `agents`, which runs the turn locally or on EDGE as the session was opened.
 */
export type MakeOptions = {
  /** The trigger store; shared with the UI that lists it. */
  triggers?: TriggerRegistry;
  /** Fact stores by agent id; shared by brains that must see the same facts. */
  stores?: Map<string, FactStoreApi>;
};

export const make = (
  agents: AgentService.Service,
  { triggers = new TriggerRegistry(), stores = new Map() }: MakeOptions = {},
): BrainMemory => {
  const facts = (agent: string): FactStoreApi => {
    let store = stores.get(agent);
    if (!store) {
      store = FactStoreLive.makeMemory();
      stores.set(agent, store);
    }
    return store;
  };

  // Outboxes by subscription id, events in the order they were queued.
  const outboxes = new Map<string, BrainService.Event[]>();
  // Event ids each subscription has queued, acknowledged or not, so a fact pushed again queues nothing.
  const queued = new Map<string, Set<string>>();

  const service: BrainService.Service = {
    push: (agent, entries, options) =>
      facts(agent)
        .putFacts(entries)
        .pipe(
          Effect.mapError(toError),
          Effect.map(() => {
            let count = 0;
            for (const subscription of triggers.list(agent)) {
              const seen = queued.get(subscription.id) ?? new Set<string>();
              queued.set(subscription.id, seen);
              for (const fact of entries) {
                const event = BrainService.matchEvent(subscription, fact, options);
                if (event && !seen.has(event.id)) {
                  seen.add(event.id);
                  outboxes.set(subscription.id, [...(outboxes.get(subscription.id) ?? []), event]);
                  count++;
                }
              }
            }
            return count;
          }),
        ),
    query: (agent, query) =>
      facts(agent)
        .query(query)
        .pipe(
          Effect.map((found): RDF.Fact[] => found),
          Effect.mapError(toError),
        ),
    subscribe: (trigger) =>
      Effect.sync(() => {
        const held = triggers.list(trigger.agent).filter(({ id }) => id !== trigger.id);
        if (held.length >= BrainService.MAX_TRIGGERS) {
          return false;
        }
        triggers.add(trigger);
        return true;
      }),
    subscriptions: (agent) => Effect.sync(() => triggers.list(agent)),
    unsubscribe: (id) =>
      Effect.sync(() => {
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
        .getSession(chat)
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
