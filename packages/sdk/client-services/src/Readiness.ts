//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Trigger } from '@dxos/async';
import { Hook } from '@dxos/effect';

import * as Events from './Events.ts';

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

export const StackReadinessLayer: Layer.Layer<StackReadinessService, never, Hook.Controller> = Layer.effect(
  StackReadinessService,
  Effect.gen(function* () {
    const initialized = new Trigger();
    yield* Hook.on(
      Events.DataSpacesAvailable,
      Effect.fn('StackReadiness.onDataSpacesAvailable')(function* () {
        initialized.wake();
      }),
    );
    return { initialized };
  }),
);
