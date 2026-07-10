//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Plan } from '@dxos/assistant-toolkit';
import { getSpace } from '@dxos/client/echo';
import { Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';

import { TaskList } from '#components';
import { useTraceMessages } from '#hooks';

export type PlanArticleProps = AppSurface.ObjectArticleProps<Plan.Plan>;

export const PlanArticle = ({ role, attendableId, subject }: PlanArticleProps) => {
  const { hasAttention } = useAttention(attendableId);
  const space = getSpace(subject);
  const traceMessages = useTraceMessages(space);

  return (
    <Panel.Root role={role} classNames='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root disabled={!hasAttention} />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            <TaskList plan={subject} space={space} traceMessages={traceMessages} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

PlanArticle.displayName = 'PlanArticle';
