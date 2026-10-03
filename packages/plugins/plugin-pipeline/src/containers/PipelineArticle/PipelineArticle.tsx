//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Panel } from '@dxos/react-ui';
import { Attention } from '@dxos/react-ui-attention';
import { useAttention } from '@dxos/react-ui-attention';
import { useMenuContribution } from '@dxos/react-ui-menu';
import { type Pipeline } from '@dxos/types';

import { type ItemProps, PipelineComponent } from '#components';
import { usePipelineBoardModel } from '#hooks';

export type PipelineArticleProps = AppSurface.ObjectArticleProps<Pipeline.Pipeline>;

export const PipelineArticle = ({ role, subject: pipeline, attendableId }: PipelineArticleProps) => {
  const registry = Hooks.useCapability(Capabilities.AtomRegistry);
  const model = usePipelineBoardModel(pipeline, registry);
  const { invokePromise } = Hooks.useOperationInvoker();
  const { hasAttention } = useAttention(attendableId);

  const handleColumnAdd = useCallback(
    () =>
      invokePromise(LayoutOperation.UpdateCompanion, {
        subject: Attention.linkedSegment('settings'),
      }),
    [invokePromise],
  );

  return (
    <PipelineComponent.Root Item={PipelineItem} onAddColumn={handleColumnAdd}>
      <Panel.Root role={role}>
        <Panel.Header>
          <PipelineComponent.Toolbar inactive={!hasAttention} />
        </Panel.Header>
        <Panel.Body asChild>
          <PipelineComponent.Content asChild model={model}>
            <PipelineComponent.Columns pipeline={pipeline} />
          </PipelineComponent.Content>
        </Panel.Body>
      </Panel.Root>
    </PipelineComponent.Root>
  );
};

const PipelineItem = ({ item, projectionModel, menu }: ItemProps) => {
  // The card menu renders in a portal; resolve the origin plank from the item element instead.
  const [cardRef, pivotId] = ToolkitHooks.useCardPivot();
  const items = ToolkitHooks.useObjectMenuItems(item, pivotId);
  useMenuContribution(menu, {
    id: ToolkitHooks.OBJECT_ACTIONS_CONTRIBUTION_ID,
    mode: 'additive',
    priority: ToolkitHooks.OBJECT_ACTIONS_CONTRIBUTION_PRIORITY,
    items,
  });

  return (
    <div ref={cardRef} className='contents'>
      <Surface.Surface
        type={AppSurface.CardContent}
        data={{
          subject: item,
          projection: projectionModel,
        }}
        limit={1}
      />
    </div>
  );
};

PipelineArticle.displayName = 'PipelineArticle';
