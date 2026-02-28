//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/ui';
import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Surface } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps, useObjectMenuContributions } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { ATTENDABLE_PATH_SEPARATOR, DeckOperation } from '@dxos/plugin-deck/types';
import { Layout } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { type Pipeline as PipelineType } from '@dxos/types';

import { type ItemProps, PipelineComponent, usePipelineBoardModel } from '../../components';

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
        primary: attendableId,
        companion: `${attendableId}${ATTENDABLE_PATH_SEPARATOR}settings`,
      }),
    [invokePromise, attendableId],
  );

  return (
    <Layout.Main role={role} toolbar>
      <PipelineComponent.Root Item={PipelineItem} model={model} onAddColumn={handleColumnAdd}>
        <PipelineComponent.Toolbar disabled={!hasAttention} />
        <PipelineComponent.Content pipeline={pipeline} />
      </PipelineComponent.Root>
    </Layout.Main>
  );
};

const PipelineItem = ({ item, projectionModel }: ItemProps) => {
  useObjectMenuContributions(item);

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
