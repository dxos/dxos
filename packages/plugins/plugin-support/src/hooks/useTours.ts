//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useRef, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Tour from '@dxos/app-toolkit/Tour';
import { log } from '@dxos/log';

import { useAttendedData } from './useAttendedData.ts';

/** Stable identity: the caller feeds this straight into an effect dependency. */
const NO_STEPS: Tour.Step[] = [];

/**
 * Tours that apply to `data` — the graph node data of whatever is on screen, or `undefined` for the
 * app itself, which selects the global tours.
 */
export const useTours = (data?: unknown): readonly Tour.Definition[] => {
  const tours = useCapabilities(AppCapabilities.Tour);
  return useMemo(() => Tour.matching(tours, data), [tours, data]);
};

/**
 * Steps for the running tour: its own steps plus every contributed fragment matching what is on
 * screen, in position order.
 *
 * Composed when a tour STARTS, not when `tourId` merely has a value. The id outlives the run (it is
 * persisted, so a reload restores the last one), and composing on the id alone ran at boot with
 * nothing attended yet — every fragment matcher was asked about an absent subject, rejected, and the
 * bare result was cached under that id for the life of the session.
 *
 * The subject is read through a ref rather than taken as a dependency: a step's `before` hook moves
 * the page about, and recomposing mid-tour would swap the machine's steps under the reader.
 *
 * Returns an empty list until the loaders settle. Handing back the previous tour's steps in the
 * meantime would start the machine on them, since starting a tour and loading its steps are separate
 * ticks and the machine opens on whatever it holds at the first of them.
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

    // `allSettled`, not `all`: the loaders come from different plugins, and with all-or-nothing a
    // single failing contributor took the whole tour down to nothing. That is a tour that
    // silently does not open, rather than one missing a step. A broken loader now costs its own
    // steps and says so.
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
