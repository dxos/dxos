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

const handler: Operation.WithHandler<typeof HelpOperation.Start> = HelpOperation.Start.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const tours = yield* Capability.getAll(AppCapabilities.Tour);
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
