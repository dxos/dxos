//
// Copyright 2025 DXOS.org
//

import React, { type FC, useState } from 'react';

import { type Obj } from '@dxos/echo';
import { ScrollArea } from '@dxos/react-ui';
import { Timeline } from '@dxos/react-ui-trace';

import { useExecutionGraph } from './useExecutionGraph.ts';

type ExecutionGraphPanelProps = {
  objects: readonly Obj.Unknown[];
};

export const ExecutionGraphPanel: FC<ExecutionGraphPanelProps> = ({ objects }) => {
  const { branches, commits } = useExecutionGraph(objects);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);

  return (
    <ScrollArea.Root orientation='vertical' classNames='flex flex-col h-full' thin>
      <ScrollArea.Viewport ref={setViewport}>
        <Timeline branches={branches} commits={commits} scroller={viewport} />
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};
