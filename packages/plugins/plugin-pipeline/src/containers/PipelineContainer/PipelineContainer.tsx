//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useEffect } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/ui';
import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Surface } from '@dxos/app-framework/ui';
import {
  OBJECT_ACTIONS_CONTRIBUTION_ID,
  OBJECT_ACTIONS_CONTRIBUTION_PRIORITY,
  type ObjectSurfaceProps,
  useObjectMenuItems,
} from '@dxos/app-toolkit/ui';
import { companionSegment } from '@dxos/app-toolkit';
import { DeckOperation } from '@dxos/plugin-deck/operations';
import { Panel } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { useMenu } from '@dxos/react-ui-menu';
import { type Pipeline } from '@dxos/types';

import { type ItemProps, PipelineComponent } from '../../components';
import { usePipelineBoardModel } from '../../hooks';

const PIPELINE_ITEM = 'PipelineItem';

export type PipelineContainerProps = ObjectSurfaceProps<Pipeline.Pipeline>;

export const PipelineContainer = ({ role, subject: pipeline, attendableId }: PipelineContainerProps) => {
  const registry = useCapability(Capabilities.AtomRegistry);
  const model = usePipelineBoardModel(pipeline, registry);
  const { invokePromise } = useOperationInvoker();
  const { hasAttention } = useAttention(attendableId);

  const handleColumnAdd = useCallback(
    () =>
      invokePromise(DeckOperation.ChangeCompanion, {
        companion: companionSegment('settings'),
      }),
    [invokePromise],
  );

  return (
    <PipelineComponent.Root Item={PipelineItem} onAddColumn={handleColumnAdd}>
      <Panel.Root role={role}>
        <Panel.Toolbar asChild>
          <PipelineComponent.Toolbar disabled={!hasAttention} />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <PipelineComponent.Content asChild model={model}>
            <PipelineComponent.Columns pipeline={pipeline} />
          </PipelineComponent.Content>
        </Panel.Content>
      </Panel.Root>
    </PipelineComponent.Root>
  );
};

const PipelineItem = ({ item, projectionModel }: ItemProps) => {
  const menu = useMenu(PIPELINE_ITEM);
  const items = useObjectMenuItems(item);

  useEffect(() => {
    menu.addMenuItems({
      id: OBJECT_ACTIONS_CONTRIBUTION_ID,
      mode: 'additive',
      priority: OBJECT_ACTIONS_CONTRIBUTION_PRIORITY,
      items,
    });

    return () => menu.removeMenuItems(OBJECT_ACTIONS_CONTRIBUTION_ID);
  }, [menu, items]);

  return (
    <Surface.Surface
      role='card--content'
      data={{
        subject: item,
        projection: projectionModel,
      }}
      limit={1}
    />
  );
};
