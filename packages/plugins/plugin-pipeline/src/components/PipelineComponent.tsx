//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type FC } from 'react';

import { type Obj } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Toolbar, type ToolbarRootProps, useTranslation } from '@dxos/react-ui';
import { Stack } from '@dxos/react-ui-stack';
import { type ProjectionModel } from '@dxos/schema';
import { type Pipeline as PipelineType } from '@dxos/types';

import { meta } from '../meta';

import { PipelineColumn } from './PipelineColumn';

type ItemProps = {
  item: Obj.Unknown;
  projectionModel?: ProjectionModel;
};

const itemNoOp = ({ item }: ItemProps) => <span>{item.id}</span>;

type PipelineContextValue = {
  Item: FC<ItemProps>;
  // TODO(wittjosiah): Support adding items.
  //   If the created item doesn't match the current query, it will not be visible.
  // onAddItem?: (schema: Schema.Schema.AnyNoContext) => void;
  onAddColumn?: () => void;
};

//
// Root
//

type PipelineRootProps = PipelineContextValue;

const PIPELINE_ROOT = 'Pipeline.Root';

const [PipelineRoot, usePipeline] = createContext<PipelineContextValue>(PIPELINE_ROOT, {
  Item: itemNoOp,
});

PipelineRoot.displayName = PIPELINE_ROOT;

//
// Content
//

type PipelineContentProps = {
  pipeline: PipelineType.Pipeline;
};

const PipelineContent = ({ pipeline }: PipelineContentProps) => {
  const [columns] = useObject(pipeline, 'columns');

  return (
    <Stack orientation='horizontal' size='contain' rail={false}>
      {columns.map((column) => {
        return <PipelineColumn key={column.view.dxn.toString()} column={column} />;
      })}
    </Stack>
  );
};

PipelineContent.displayName = 'Pipeline.Content';

//
// Toolbar
//

export const PipelineToolbar = (props: ToolbarRootProps) => {
  const { t } = useTranslation(meta.id);
  const { onAddColumn } = usePipeline(PipelineToolbar.displayName);

  return (
    <Toolbar.Root {...props}>
      <Toolbar.IconButton icon='ph--plus--regular' iconOnly label={t('add column label')} onClick={onAddColumn} />
    </Toolbar.Root>
  );
};

PipelineToolbar.displayName = 'Pipeline.Toolbar';

//
// Project
//

export const PipelineComponent = {
  Root: PipelineRoot,
  Content: PipelineContent,
  Toolbar: PipelineToolbar,
};

export { usePipeline };

export type { ItemProps, PipelineContextValue, PipelineRootProps };
