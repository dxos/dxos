//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as AgentService from '@dxos/compute/AgentService';
import { type FactStoreApi } from '@dxos/pipeline-rdf';

import { BrainService } from '#types';

import { TriggerRegistry } from '../triggers.ts';
import * as BrainMemory from './BrainMemory.ts';

export type TestBrainOptions = {
  /**
   * `session` submits a woken prompt to the chat's session, so a turn runs there; `record` only keeps
   * the request, for tests of where a delivery goes rather than what the agent then says.
   * @default 'session'
   */
  wake?: 'session' | 'record';
};

/**
 * One in-memory brain for a test file: the layer can be provided both to the resolver (operations) and
 * to the test body, and every build sees the same stores.
 */
export const makeTestBrain = ({ wake = 'session' }: TestBrainOptions = {}) => {
  const triggers = new TriggerRegistry();
  const stores = new Map<string, FactStoreApi>();
  const wakes: BrainService.WakeRequest[] = [];

  const layer: Layer.Layer<BrainService.BrainService, never, AgentService.AgentService> = Layer.effect(
    BrainService.BrainService,
    AgentService.AgentService.pipe(
      Effect.map((agents) => {
        // Built once per layer, each with its own host's agents, over the same stores.
        const { service: memory } = BrainMemory.make(agents, { triggers, stores });
        // Triggers come back through JSON, as from EDGE's brain: their refs then have no resolver of their own.
        const service: BrainService.Service = {
          ...memory,
          subscriptions: (agent) =>
            memory
              .subscriptions(agent)
              .pipe(
                Effect.map((listed) =>
                  listed.map((trigger) =>
                    BrainService.decodeTrigger(JSON.parse(JSON.stringify(BrainService.encodeTrigger(trigger)))),
                  ),
                ),
              ),
        };
        return wake === 'session'
          ? service
          : { ...service, wake: (request: BrainService.WakeRequest) => Effect.sync(() => void wakes.push(request)) };
      }),
    ),
  );

  return {
    layer,
    triggers,
    wakes,
    /** The agent's fact store, if it has recorded any facts. */
    facts: (agent: string) => stores.get(agent),
  };
};
