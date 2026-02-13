//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Surface } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { ATTENDABLE_PATH_SEPARATOR, DeckOperation } from '@dxos/plugin-deck/types';
import { useAttention } from '@dxos/react-ui-attention';
import { Layout } from '@dxos/react-ui-mosaic';
import { type Pipeline as PipelineType } from '@dxos/types';

import { type ItemProps, PipelineComponent } from './PipelineComponent';

export type PipelineContainerProps = SurfaceComponentProps<PipelineType.Pipeline>;

export const PipelineContainer = ({ role, subject: pipeline }: PipelineContainerProps) => {
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
      <PipelineComponent.Root Item={PipelineItem} onAddColumn={handleColumnAdd}>
        <PipelineComponent.Toolbar disabled={!hasAttention} />
        <PipelineComponent.Content pipeline={pipeline} />
      </PipelineComponent.Root>
    </Layout.Main>
  );
};

const PipelineItem = ({ item, projectionModel }: ItemProps) => {
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

export default PipelineContainer;
