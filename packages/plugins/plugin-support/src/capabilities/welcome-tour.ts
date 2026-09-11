//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Tour from '@dxos/app-toolkit/Tour';
import { log } from '@dxos/log';

import { meta } from '#meta';

import { WELCOME_TOUR_ID } from '../constants.ts';

/**
 * Registers the host app's walkthrough as an ordinary global-trigger tour, so it and a type's tour
 * run through one mechanism.
 *
 * The app passes a loader rather than an array because its plugin definitions are eager; it is
 * awaited here, once, so the capability only ever holds steps. A loader that fails costs the welcome
 * tour rather than this module, which other tours are registered through.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* (helpSteps?: () => Promise<Tour.Step[]>) {
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
      label: ['open-help-tour.message', { ns: meta.profile.key }],
      matches: Tour.whenGlobal,
      steps,
    });
  }),
);
