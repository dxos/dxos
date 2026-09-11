//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as SupportCapabilities from '@dxos/plugin-support/SupportCapabilities';
import * as Tour from '@dxos/plugin-support/Tour';

import { DICTATABLE_TYPES } from '../dictatable.ts';

/** Adds a dictation step wherever the control appears. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(SupportCapabilities.TourFragment, {
      matches: Tour.whenTypes(DICTATABLE_TYPES),
      steps: () => import('../tours/index.ts').then(({ steps }) => steps),
    }),
  ),
);
