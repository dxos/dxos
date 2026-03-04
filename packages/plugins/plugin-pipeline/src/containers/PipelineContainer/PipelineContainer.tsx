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
import { Container } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { useMenuContributions } from '@dxos/react-ui-menu';
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
    <Container.Main role={role} toolbar>
      <PipelineComponent.Root Item={PipelineItem} model={model} onAddColumn={handleColumnAdd}>
        <PipelineComponent.Toolbar disabled={!hasAttention} />
        <PipelineComponent.Content pipeline={pipeline} />
      </PipelineComponent.Root>
    </Container.Main>
  );
};

const PipelineItem = ({ item, projectionModel }: ItemProps) => {
  const menu = useMenuContributions(PIPELINE_ITEM);
  const items = useObjectMenuItems(item);

  useEffect(() => {
    menu.addContribution({
      id: OBJECT_ACTIONS_CONTRIBUTION_ID,
      mode: 'additive',
      priority: OBJECT_ACTIONS_CONTRIBUTION_PRIORITY,
      items,
    });

    return () => menu.removeContribution(OBJECT_ACTIONS_CONTRIBUTION_ID);
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
