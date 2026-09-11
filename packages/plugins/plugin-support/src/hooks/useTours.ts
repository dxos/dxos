//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useRef, useState } from 'react';

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
 * order. Composed on `running`, not on `tourId`, which outlives the run. Empty until the loaders
 * settle.
 */
export const useTourSteps = (tourId: string | undefined, running: boolean): Tour.Step[] => {
  const tours = useCapabilities(AppCapabilities.Tour);
  const fragments = useCapabilities(AppCapabilities.TourFragment);
  const data = useAttendedData();
  const subject = useRef(data);
  subject.current = data;

  const [loaded, setLoaded] = useState<{ tourId?: string; steps: Tour.Step[] }>({ steps: NO_STEPS });

  useEffect(() => {
    if (!tourId || !running) {
      return;
    }

    const tour = tours.find((candidate) => candidate.id === tourId);
    if (!tour) {
      log.warn('no tour registered', { tourId });
      setLoaded({ tourId, steps: NO_STEPS });
      return;
    }

    let live = true;
    const loaders = Tour.stepLoaders(tour, fragments, subject.current);
    void Promise.allSettled(loaders.map((load) => load())).then((results) => {
      if (!live) {
        return;
      }

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          log.warn('tour steps unavailable', { tourId, index, error: result.reason });
        }
      });

      const steps = results.flatMap((result) => (result.status === 'fulfilled' ? [...result.value] : []));
      if (steps.length === 0) {
        log.warn('tour has no steps', { tourId });
      }

      setLoaded({ tourId, steps: steps.length > 0 ? steps : NO_STEPS });
    });
    return () => {
      live = false;
    };
  }, [tourId, running, tours, fragments]);

  return tourId !== undefined && loaded.tourId === tourId ? loaded.steps : NO_STEPS;
};
