//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Tour from '@dxos/app-toolkit/Tour';

import { meta } from '#meta';

import { WELCOME_TOUR_ID } from '../constants.ts';

/**
 * Registers the host app's walkthrough as an ordinary tour whose matcher is the global one, so the
 * welcome tour and a type's tour run through one mechanism. An app that supplies no steps registers
 * nothing, and "Show welcome tour" then has nothing to offer.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* (helpSteps?: () => Promise<Tour.Step[]>) {
    if (!helpSteps) {
      return Capability.contributeAll(AppCapabilities.Tour, []);
    }

    return Capability.contribute(AppCapabilities.Tour, {
      id: WELCOME_TOUR_ID,
      label: ['open-help-tour.message', { ns: meta.profile.key }],
      matches: Tour.whenGlobal,
      steps: helpSteps,
    });
  }),
);
