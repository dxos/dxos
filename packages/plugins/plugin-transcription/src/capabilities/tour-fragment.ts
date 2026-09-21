//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Tour from '@dxos/app-toolkit/Tour';

import { Dictatable } from '#types';

import { steps } from '../tours/index.ts';

export const TourFragment = Capability.makeModule(
  'TourFragment',
  { provides: [AppCapabilities.TourFragment], environments: [] },
  () =>
    Effect.succeed(
      Capability.contribute(AppCapabilities.TourFragment, {
        matches: Tour.whenTypes(Dictatable.types),
        steps,
      }),
    ),
);
