//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import * as Agent from '@dxos/assistant/Agent';
import * as AgentService from '@dxos/compute/AgentService';
import { Fact, MemoryQuery, MemoryService, Subscription } from '@dxos/echo-memory';

import { BrainService } from '#types';

import { TriggerRegistry } from '../triggers.ts';

/** A brain over a space's memory, plus the trigger registry the UI lists. */
export type BrainMemory = {
  readonly service: BrainService.Service;
  readonly triggers: TriggerRegistry;
};

export type MakeOptions = {
  /** The registry the brain mirrors its triggers into, for the UI; a fresh one by default. */
  triggers?: TriggerRegistry;
};

/**
 * How soon a host asks again while the agent has watches: the memory queues time-driven wakes on its own clock, and
 * the host delivers them when it next runs the agent's due watches.
 */
export const POLL_MS = 60_000;

const toError = (cause: unknown) =>
  new BrainService.BrainError({ message: cause instanceof Error ? cause.message : String(cause), cause });

const decodePattern = Schema.decodeUnknownEffect(MemoryQuery.FactQuery);

/**
 * A brain over the space's {@link MemoryService.Service}, which the client services host runs: facts, read cursors,
 * the rule evaluator, its clock and every outbox live there, shared by every page and operation. A trigger is a memory
 * subscription owned by its agent, with the trigger itself as the subscription's payload. Waking a chat submits the
 * prompt to its session through `agents`, which runs the turn locally or on EDGE as the session was opened.
 */
export const make = (
  agents: AgentService.Service,
  memory: MemoryService.Service,
  { triggers = new TriggerRegistry() }: MakeOptions = {},
): BrainMemory => {
  /** The agent's triggers as the memory holds them; also refreshes the registry the UI lists. */
  const listTriggers = (agent: string) =>
    memory.subscriptions(Fact.EntityKey.make(agent)).pipe(
      Effect.flatMap((subscriptions) =>
        Effect.try(() => subscriptions.map(({ payload }) => BrainService.decodeTrigger(payload))),
      ),
      Effect.tap((listed) =>
        Effect.sync(() => {
          triggers.list(agent).forEach(({ id }) => listed.some((trigger) => trigger.id === id) || triggers.remove(id));
          listed.forEach((trigger) => triggers.add(trigger));
        }),
      ),
      Effect.mapError(toError),
    );

  const service: BrainService.Service = {
    push: (agent, facts, options) =>
      memory
        .put(facts, {
          ...(options?.quiet ? { quiet: options.quiet.map((speaker) => Fact.EntityKey.make(speaker)) } : {}),
          ...(options?.read
            ? { read: { source: Fact.SourceUri.make(options.read.source), through: options.read.through } }
            : {}),
        })
        .pipe(Effect.mapError(toError)),

    // The memory evaluates time-driven rules on its own clock; a host only needs to deliver what it queued.
    tick: () => Effect.succeed(0),
    nextDueAt: (agent) =>
      listTriggers(agent).pipe(
        Effect.map((listed) => (listed.length > 0 ? new Date(Date.now() + POLL_MS).toISOString() : undefined)),
      ),

    query: (_agent, query) =>
      decodePattern(query).pipe(
        Effect.flatMap((pattern) => memory.query(MemoryQuery.facts(pattern))),
        Effect.map((facts) => [...facts]),
        Effect.mapError(toError),
      ),

    // The memory is the space's, so this forgets the facts every agent in the space has read; subscriptions stay.
    reset: () => memory.reset().pipe(Effect.mapError(toError)),

    readThrough: (_agent, source) =>
      memory.query(MemoryQuery.cursor(Fact.SourceUri.make(source))).pipe(Effect.mapError(toError)),

    subscribe: (trigger) =>
      Effect.gen(function* () {
        const held = (yield* listTriggers(trigger.agent)).filter(({ id }) => id !== trigger.id);
        if (held.length >= BrainService.MAX_TRIGGERS) {
          return false;
        }
        const added = yield* memory
          .subscribe({
            id: Subscription.SubscriptionId.make(trigger.id),
            owner: Fact.EntityKey.make(trigger.agent),
            rules: BrainService.toSubscription(trigger).rules,
            createdAt: trigger.createdAt,
            payload: BrainService.encodeTrigger(trigger),
          })
          .pipe(Effect.mapError(toError));
        if (added) {
          triggers.add(trigger);
        }
        return added;
      }),

    subscriptions: (agent) => listTriggers(agent),

    unsubscribe: (id) =>
      memory.unsubscribe(Subscription.SubscriptionId.make(id)).pipe(
        Effect.tap(() => Effect.sync(() => triggers.remove(id))),
        Effect.mapError(toError),
      ),

    take: (id) =>
      memory.take(Subscription.SubscriptionId.make(id)).pipe(
        Effect.map((events) => events.map((event) => ({ ...event, facts: [...event.facts] }))),
        Effect.mapError(toError),
      ),

    ack: (id, events) =>
      memory
        .ack(
          Subscription.SubscriptionId.make(id),
          events.map((event) => Subscription.MemoryEventId.make(event)),
        )
        .pipe(Effect.mapError(toError)),

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

  return { service, triggers };
};

/** {@link make} as a layer over the host's `AgentService` and the space's `MemoryService`. */
export const layer = (
  options?: MakeOptions,
): Layer.Layer<BrainService.BrainService, never, AgentService.AgentService | MemoryService.MemoryService> =>
  Layer.effect(
    BrainService.BrainService,
    Effect.gen(function* () {
      const agents = yield* AgentService.AgentService;
      const memory = yield* MemoryService.MemoryService;
      return make(agents, memory, options).service;
    }),
  );
