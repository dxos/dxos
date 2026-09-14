//
// Copyright 2026 DXOS.org
//

import { useMemo, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Tour from '@dxos/app-toolkit/Tour';
import { log } from '@dxos/log';

import { useAttendedData } from './useAttendedData.ts';

const NO_STEPS: Tour.Step[] = [];

export const useTours = (data?: unknown): readonly Tour.Definition[] => {
  const tours = useCapabilities(AppCapabilities.Tour);
  return useMemo(() => Tour.matching(tours, data), [tours, data]);
};

export const useTourSteps = (tourId: string | undefined): readonly Tour.Step[] => {
  const tours = useCapabilities(AppCapabilities.Tour);
  const fragments = useCapabilities(AppCapabilities.TourFragment);
  const data = useAttendedData();
  const [start, setStart] = useState<{ tourId?: string; subject: unknown }>({ subject: undefined });
  if (start.tourId !== tourId) {
    setStart({ tourId, subject: data });
  }
  const subject = start.tourId === tourId ? start.subject : data;

  return useMemo(() => {
    if (!tourId) {
      return NO_STEPS;
    }

    const tour = tours.find((candidate) => candidate.id === tourId);
    if (!tour) {
      log.warn('no tour registered', { tourId });
      return NO_STEPS;
    }

    const steps = Tour.composeSteps(tour, fragments, subject);
    if (steps.length === 0) {
      log.warn('tour has no steps', { tourId });
    }

    return steps;
  }, [tourId, tours, fragments, subject]);
};
