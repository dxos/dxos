//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import type * as Surface from '@dxos/app-framework/Surface';
import { Timeline } from '@dxos/react-ui-trace';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { toCommits } from './trajectory-commits.ts';
import { useTrajectoryEvents } from './use-trajectory-events.ts';

/**
 * The newest chat's trajectory as a git graph beside it: a commit per event, a branch per feed branch (main, each turn,
 * each thread), merges where a thread ends.
 */
export const TrajectoryGraphModule = (_props: Surface.ComponentProps<Record<string, unknown>>) => {
  const events = useTrajectoryEvents();
  const commits = useMemo(() => toCommits(events), [events]);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);

  return (
    <ScrollArea.Root data-testid='trajectory-graph'>
      <ScrollArea.Viewport ref={setViewport}>
        <Timeline commits={commits} scroller={viewport} showTimestamp />
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};
