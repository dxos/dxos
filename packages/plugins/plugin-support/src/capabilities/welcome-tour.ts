//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';
import { SupportCapabilities, Tour } from '#types';

import { WELCOME_TOUR_ID } from '../constants.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* (helpSteps?: () => Promise<Tour.Step[]>) {
    if (!helpSteps) {
      return Capability.contributeAll(SupportCapabilities.Tour, []);
    }

    return Capability.contribute(SupportCapabilities.Tour, {
      id: WELCOME_TOUR_ID,
      label: ['open-help-tour.message', { ns: meta.profile.key }],
      matches: Tour.whenGlobal,
      steps: helpSteps,
    });
  }),
);
