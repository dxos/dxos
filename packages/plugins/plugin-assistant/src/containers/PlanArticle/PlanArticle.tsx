//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Plan } from '@dxos/assistant-toolkit';
import { Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';

import { TaskList } from '#components';

export type PlanArticleProps = AppSurface.ObjectArticleProps<Plan.Plan>;

export const PlanArticle = ({ role, attendableId, subject }: PlanArticleProps) => {
  const { hasAttention } = useAttention(attendableId);

  return (
    <Panel.Root role={role} classNames='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root disabled={!hasAttention} />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            <TaskList plan={subject} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
