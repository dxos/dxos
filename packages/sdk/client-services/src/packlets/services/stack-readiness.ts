//
// Copyright 2025 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Trigger } from '@dxos/async';
import { Event } from '@dxos/effect';

import { DataSpacesReady } from './events.ts';

/**
 * Readiness gate for the identity-bound services: `initialized` wakes once the data spaces are
 * open, whether the identity was persisted, created, or accepted.
 */
export interface StackReadiness {
  readonly initialized: Trigger;
}

export class StackReadinessService extends EffectContext.Service<StackReadinessService, StackReadiness>()(
  '@dxos/client-services/StackReadiness',
) {}

export const StackReadinessLayer: Layer.Layer<StackReadinessService, never, Event.Bus> = Layer.effect(
  StackReadinessService,
  Effect.gen(function* () {
    const initialized = new Trigger();
    yield* DataSpacesReady.pipe(
      Event.handler(() => Effect.sync(() => initialized.wake())),
      Event.subscribe,
    );
    return { initialized };
  }),
);
