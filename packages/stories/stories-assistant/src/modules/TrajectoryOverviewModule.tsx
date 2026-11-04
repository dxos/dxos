//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import type * as Surface from '@dxos/app-framework/Surface';
import * as Reducer from '@dxos/compute/Reducer';
import { Timeline } from '@dxos/react-ui-trace';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { toOverview } from './trajectory-overview.ts';
import { useTrajectoryEvents } from './use-trajectory-events.ts';

/**
 * What the newest chat's agent is doing, at a glance, as a git graph: the tasks it finished on the trunk, a branch per
 * thread still running (subagents off the thread that delegated them), and the prompts it has yet to take.
 */
export const TrajectoryOverviewModule = (_props: Surface.ComponentProps<Record<string, unknown>>) => {
  const events = useTrajectoryEvents();
  const commits = useMemo(() => toOverview(Reducer.run(Reducer.thread, events).state), [events]);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);

  return (
    <ScrollArea.Root data-testid='trajectory-overview'>
      <ScrollArea.Viewport ref={setViewport}>
        <Timeline commits={commits} scroller={viewport} />
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};
