//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Tour from '@dxos/app-toolkit/Tour';
import * as Operation from '@dxos/compute/Operation';
import { log } from '@dxos/log';

import { HelpCapabilities, HelpOperation } from '#types';

/** Runs the app's own walkthrough: the first registered tour whose matcher applies to no subject. */
const handler: Operation.WithHandler<typeof HelpOperation.Start> = HelpOperation.Start.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const tours = yield* Capability.getAll(AppCapabilities.Tour);
      // No argument selects the global matchers.
      const [tour] = Tour.matching(tours);
      if (!tour) {
        log.warn('no global tour registered');
        return;
      }

      yield* Capabilities.updateAtomValue(HelpCapabilities.State, (state) => ({
        ...state,
        running: true,
        tourId: tour.id,
        seenTours: HelpCapabilities.withSeenTour(state, tour.id),
      }));
    }),
  ),
);

export default handler;
