//
// Copyright 2026 DXOS.org
//

import { useEffect } from 'react';

import { useAtomCapabilityState, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';

import { useAttendedData, useAutoToursEnabled } from '#hooks';
import { HelpCapabilities, HelpOperation, SupportCapabilities, Tour } from '#types';

/**
 * Runs a matching `auto` tour the first time the user opens something it applies to. Renders nothing.
 *
 * Silent wherever the app skips auth, which is the same condition the onboarding flow uses to hold
 * the welcome tour back. Local dev would otherwise hand every fresh profile a tour per object type
 * to dismiss, and the reason to suppress one unprompted tour there is the reason to suppress all.
 *
 * Matched against the ATTENDED node's data rather than the deck's active list, because a restored
 * deck reopens every plank it held at once and treating that as "opened" would fire tours for things
 * nobody looked at. With nothing attended this does nothing at all, which is what keeps the app's
 * global tour out of it: a global matcher accepts exactly the absent subject this would otherwise
 * pass at boot. The global tour is started deliberately, by the onboarding flow (which gates it
 * on the auth path) or by the Home toolbar, never by being here.
 */
export const TourAutoStart = () => {
  const enabled = useAutoToursEnabled();
  const tours = useCapabilities(SupportCapabilities.Tour);
  const [state] = useAtomCapabilityState(HelpCapabilities.State);
  const { invokePromise } = useOperationInvoker();

  const data = useAttendedData();

  useEffect(() => {
    if (!enabled || state.running || data === undefined) {
      return;
    }

    const seen = HelpCapabilities.seenTours(state);
    const unseen = tours.filter((candidate) => candidate.auto && !seen.includes(candidate.id));
    const [tour] = Tour.matching(unseen, data);
    if (tour) {
      void invokePromise(HelpOperation.StartTour, { tourId: tour.id });
    }
  }, [enabled, data, tours, state.running, state.seenTours, invokePromise]);

  return null;
};

TourAutoStart.displayName = 'TourAutoStart';
