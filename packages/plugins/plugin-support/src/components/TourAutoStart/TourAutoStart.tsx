//
// Copyright 2026 DXOS.org
//

import { useEffect } from 'react';

import { useAtomCapabilityState, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Tour from '@dxos/app-toolkit/Tour';

import { useAttendedData } from '#hooks';
import { HelpCapabilities, HelpOperation } from '#types';

/**
 * Runs a matching `auto` tour the first time the user opens something it applies to. Renders nothing.
 *
 * Matched against the ATTENDED node's data rather than the deck's active list, because a restored
 * deck reopens every plank it held at once and treating that as "opened" would fire tours for things
 * nobody looked at. With nothing attended this does nothing at all, which is what keeps the app's
 * global tour out of it: a global matcher accepts exactly the absent subject this would otherwise
 * pass at boot. The global tour is started deliberately, by the onboarding flow (which gates it
 * on the auth path) or by the Home toolbar, never by being here.
 */
export const TourAutoStart = () => {
  const tours = useCapabilities(AppCapabilities.Tour);
  const [state] = useAtomCapabilityState(HelpCapabilities.State);
  const { invokePromise } = useOperationInvoker();

  const data = useAttendedData();

  useEffect(() => {
    if (state.running || data === undefined) {
      return;
    }

    const seen = HelpCapabilities.seenTours(state);
    const unseen = tours.filter((candidate) => candidate.auto && !seen.includes(candidate.id));
    const [tour] = Tour.matching(unseen, data);
    if (tour) {
      void invokePromise(HelpOperation.StartTour, { tourId: tour.id });
    }
  }, [data, tours, state.running, state.seenTours, invokePromise]);

  return null;
};

TourAutoStart.displayName = 'TourAutoStart';
