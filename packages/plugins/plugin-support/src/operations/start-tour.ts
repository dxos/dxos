//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Operation from '@dxos/compute/Operation';

import { HelpCapabilities, HelpOperation } from '#types';

const handler: Operation.WithHandler<typeof HelpOperation.StartTour> = HelpOperation.StartTour.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ tourId, subjectId }) {
      yield* Capabilities.updateAtomValue(HelpCapabilities.State, (state) => ({
        ...state,
        running: true,
        tourId,
        subjectId,
        seenTours: state.seenTours.includes(tourId) ? state.seenTours : [...state.seenTours, tourId],
      }));
    }),
  ),
);

export default handler;
