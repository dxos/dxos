//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Tour from '@dxos/app-toolkit/Tour';
import { log } from '@dxos/log';

import { WELCOME_TOUR_ID } from '../constants.ts';
import { SupportNamespace } from '../namespace.ts';
import type { SupportPluginOptions } from '../types/SupportPluginOptions.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ helpSteps }: SupportPluginOptions) {
    if (!helpSteps) {
      return Capability.contributeAll(AppCapabilities.Tour, []);
    }

    const steps = yield* Effect.tryPromise(helpSteps).pipe(
      Effect.tapError((error) => Effect.sync(() => log.warn('welcome tour steps unavailable', { error }))),
      Effect.orElseSucceed((): Tour.Step[] => []),
    );
    if (steps.length === 0) {
      return Capability.contributeAll(AppCapabilities.Tour, []);
    }

    return Capability.contribute(AppCapabilities.Tour, {
      id: WELCOME_TOUR_ID,
      label: ['open-help-tour.message', { ns: SupportNamespace.key }],
      matches: Tour.whenGlobal,
      steps,
    });
  }),
);
