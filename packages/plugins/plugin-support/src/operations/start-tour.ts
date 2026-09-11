//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Operation from '@dxos/compute/Operation';

import { HelpCapabilities, HelpOperation } from '#types';

/**
 * Points the tour machine at a registered tour and runs it. The id is recorded before the tour ends
 * rather than after: a tour the user dismisses halfway has still been offered, and re-running it on
 * the next open of the same type would be an ambush.
 */
const handler: Operation.WithHandler<typeof HelpOperation.StartTour> = HelpOperation.StartTour.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ tourId }) {
      yield* Capabilities.updateAtomValue(HelpCapabilities.State, (state) => ({
        ...state,
        running: true,
        tourId,
        seenTours: HelpCapabilities.withSeenTour(state, tourId),
      }));
    }),
  ),
);

export default handler;
