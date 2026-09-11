//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Tour from '@dxos/app-toolkit/Tour';
import { log } from '@dxos/log';

import { useAttendedData } from './useAttendedData.ts';

const NO_STEPS: Tour.Step[] = [];

/** Tours that apply to `data`; `undefined` selects the global tours. */
export const useTours = (data?: unknown): readonly Tour.Definition[] => {
  const tours = useCapabilities(AppCapabilities.Tour);
  return useMemo(() => Tour.matching(tours, data), [tours, data]);
};

/**
 * Steps for the running tour: its own plus every fragment matching what is on screen, in position
 * order. Composed in the render that starts the tour, so the machine never opens on another tour's
 * steps.
 */
export const useTourSteps = (tourId: string | undefined): readonly Tour.Step[] => {
  const tours = useCapabilities(AppCapabilities.Tour);
  const fragments = useCapabilities(AppCapabilities.TourFragment);
  const data = useAttendedData();

  return useMemo(() => {
    if (!tourId) {
      return NO_STEPS;
    }

    const tour = tours.find((candidate) => candidate.id === tourId);
    if (!tour) {
      log.warn('no tour registered', { tourId });
      return NO_STEPS;
    }

    const steps = Tour.composeSteps(tour, fragments, data);
    if (steps.length === 0) {
      log.warn('tour has no steps', { tourId });
    }

    return steps;
    // The subject is read when the tour starts and deliberately not tracked: a step's `before` hook
    // moves the page about, and recomposing mid-tour would swap the machine's steps under the reader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId, tours, fragments]);
};
