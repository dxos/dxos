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
 * A brain held in process memory: pipeline-rdf's in-memory RDF store per agent and the trigger
 * registry. Nothing survives a reload. Waking a chat submits the prompt to its session through
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

  const service: BrainService.Service = {
    addFacts: (agent, entries) => facts(agent).putFacts(entries).pipe(Effect.mapError(toError)),
    queryFacts: (agent, query) =>
      facts(agent)
        .query(query)
        .pipe(
          Effect.map((found): RDF.Fact[] => found),
          Effect.mapError(toError),
        ),
    putTrigger: (trigger) =>
      Effect.sync(() => {
        const held = triggers.list(trigger.agent).filter(({ id }) => id !== trigger.id);
        if (held.length >= BrainService.MAX_TRIGGERS) {
          return false;
        }
        triggers.add(trigger);
        return true;
      }),
    listTriggers: (agent) => Effect.sync(() => triggers.list(agent)),
    removeTrigger: (id) => Effect.sync(() => triggers.remove(id)),
    wake: ({ chat, prompt, sender }) =>
      agents
        .getSession(chat)
        .pipe(
          Effect.flatMap((session) =>
            session.submitPrompt(prompt, { sender, properties: BrainService.WAKE_PROPERTIES }),
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
