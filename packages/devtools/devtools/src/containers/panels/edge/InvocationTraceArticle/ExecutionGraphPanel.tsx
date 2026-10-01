//
// Copyright 2025 DXOS.org
//

import React, { type FC, useState } from 'react';

import { type Obj } from '@dxos/echo';
import { Timeline } from '@dxos/react-ui-trace';
import { Next } from '@dxos/react-ui/next';

import { useExecutionGraph } from './useExecutionGraph.ts';

type ExecutionGraphPanelProps = {
  objects: readonly Obj.Unknown[];
};

export const ExecutionGraphPanel: FC<ExecutionGraphPanelProps> = ({ objects }) => {
  const { branches, commits } = useExecutionGraph(objects);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);

  return (
    <Next.ScrollArea.Root orientation='vertical' classNames='flex flex-col h-full' thin>
      <Next.ScrollArea.Viewport ref={setViewport}>
        <Timeline branches={branches} commits={commits} scroller={viewport} />
      </Next.ScrollArea.Viewport>
    </Next.ScrollArea.Root>
  );
};
