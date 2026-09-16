//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import { useMemo } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Tour from '@dxos/app-toolkit/Tour';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { log } from '@dxos/log';

const NO_STEPS: Tour.Step[] = [];

export const useTours = (data?: unknown): readonly Tour.Definition[] => {
  const tours = useCapabilities(AppCapabilities.Tour);
  return useMemo(() => Tour.matching(tours, data), [tours, data]);
};

/** The steps `tourId` runs for the graph node `subjectId`: its own, plus every fragment accepting that node's data. */
export const useTourSteps = (tourId: string | undefined, subjectId: string | undefined): readonly Tour.Step[] => {
  const tours = useCapabilities(AppCapabilities.Tour);
  const fragments = useCapabilities(AppCapabilities.TourFragment);
  const { graph } = useAppGraph();
  const nodeAtom = useMemo(() => graph.node(subjectId ?? ''), [graph, subjectId]);
  const node = useAtomValue(nodeAtom);
  const subject = subjectId ? Option.getOrUndefined(node)?.data : undefined;

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
