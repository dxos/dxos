//
// Copyright 2026 DXOS.org
//

import { useEffect } from 'react';

import { useAtomCapabilityState, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Tour from '@dxos/app-toolkit/Tour';

import { useAttendedData, useAutoToursEnabled } from '#hooks';
import { HelpCapabilities, HelpOperation } from '#types';

export const TourAutoStart = () => {
  const enabled = useAutoToursEnabled();
  const tours = useCapabilities(AppCapabilities.Tour);
  const [state] = useAtomCapabilityState(HelpCapabilities.State);
  const { invokePromise } = useOperationInvoker();

  const data = useAttendedData();

  useEffect(() => {
    if (!enabled || state.running || data === undefined) {
      return;
    }

    const unseen = tours.filter((candidate) => candidate.auto && !state.seenTours.includes(candidate.id));
    const [tour] = Tour.matching(unseen, data);
    if (tour) {
      void invokePromise(HelpOperation.StartTour, { tourId: tour.id });
    }
  }, [enabled, data, tours, state.running, state.seenTours, invokePromise]);

  return null;
};

TourAutoStart.displayName = 'TourAutoStart';
