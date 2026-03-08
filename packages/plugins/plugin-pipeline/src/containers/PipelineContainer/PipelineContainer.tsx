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
  type SurfaceComponentProps,
  useObjectMenuItems,
} from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { ATTENDABLE_PATH_SEPARATOR, DeckOperation } from '@dxos/plugin-deck/types';
import { Panel } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { useMenu } from '@dxos/react-ui-menu';
import { type Pipeline as PipelineType } from '@dxos/types';

import { type ItemProps, PipelineComponent, usePipelineBoardModel } from '../../components';

const PIPELINE_ITEM = 'PipelineItem';

export type PipelineContainerProps = SurfaceComponentProps<PipelineType.Pipeline>;

export const PipelineContainer = ({ role, subject: pipeline }: PipelineContainerProps) => {
  const registry = useCapability(Capabilities.AtomRegistry);
  const model = usePipelineBoardModel(pipeline, registry);
  const { invokePromise } = useOperationInvoker();
  const attendableId = Obj.getDXN(pipeline).toString();
  const { hasAttention } = useAttention(attendableId);

  const handleColumnAdd = useCallback(
    () =>
      invokePromise(DeckOperation.ChangeCompanion, {
        companion: `${attendableId}${ATTENDABLE_PATH_SEPARATOR}settings`,
      }),
    [invokePromise, attendableId],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        <PipelineComponent.Root Item={PipelineItem} model={model} onAddColumn={handleColumnAdd}>
          <PipelineComponent.Toolbar disabled={!hasAttention} />
          <PipelineComponent.Content pipeline={pipeline} />
        </PipelineComponent.Root>
      </Panel.Content>
    </Panel.Root>
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
