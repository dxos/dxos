//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import { Slot } from '@radix-ui/react-slot';
import React, { type FC, type PropsWithChildren } from 'react';

import { Obj } from '@dxos/echo';
import { Toolbar, type ToolbarRootProps, useTranslation } from '@dxos/react-ui';
import { Board, type BoardModel, useBoard, useEventHandlerAdapter } from '@dxos/react-ui-mosaic';
import { type ProjectionModel } from '@dxos/schema';
import { type Pipeline } from '@dxos/types';
import { composable, composableProps, slottable } from '@dxos/ui-theme';

import { meta } from '#meta';

import { PipelineColumn } from './PipelineColumn';

type ItemProps = {
  item: Obj.Unknown;
  projectionModel?: ProjectionModel;
};

const itemNoOp = ({ item }: ItemProps) => <span>{item.id}</span>;

//
// Root
//

type PipelineContextValue = {
  Item: FC<ItemProps>;
  // TODO(wittjosiah): Support adding items.
  //  If the created item doesn't match the current query, it will not be visible.
  // TODO(wittjosiah): onAddItem?: (schema: Schema.Schema.AnyNoContext) => void;
  onAddColumn?: () => void;
};

type PipelineRootProps = PropsWithChildren<PipelineContextValue>;

const PIPELINE_ROOT = 'Pipeline.Root';

const [PipelineRootContext, usePipeline] = createContext<PipelineContextValue>(PIPELINE_ROOT, {
  Item: itemNoOp,
});

const PipelineRoot = ({ children, ...contextValue }: PipelineRootProps) => (
  <PipelineRootContext {...contextValue}>{children}</PipelineRootContext>
);

PipelineRoot.displayName = PIPELINE_ROOT;

//
// Content
//

const PIPELINE_CONTENT_NAME = 'Pipeline.Content';

type PipelineContentProps = PropsWithChildren<{
  model: BoardModel<Pipeline.Column, Obj.Unknown>;
}>;

const PipelineContent = slottable<HTMLDivElement, PipelineContentProps>(
  ({ asChild, model, children, ...props }, forwardedRef) => {
    const Comp = asChild ? Slot : 'div';
    return (
      <Board.Root model={model}>
        <Comp {...composableProps(props)} ref={forwardedRef}>
          {children}
        </Comp>
      </Board.Root>
    );
  },
);

PipelineContent.displayName = PIPELINE_CONTENT_NAME;

//
// Columns
//

const PIPELINE_COLUMNS_NAME = 'Pipeline.Columns';

type PipelineColumnsProps = {
  pipeline: Pipeline.Pipeline;
};

const PipelineColumns = composable<HTMLDivElement, PipelineColumnsProps>(({ pipeline, ...props }) => {
  const { model } = useBoard(PIPELINE_COLUMNS_NAME);
  const columns = useAtomValue(model.columns);
  const eventHandler = useEventHandlerAdapter<Pipeline.Column, Obj.Unknown>({
    id: pipeline.id,
    // TODO(wittjosiah): Cast because columns array is readonly.
    items: columns as any,
    getId: model.getColumnId,
    get: (data) => data as unknown as Obj.Unknown,
    make: (object) => object as unknown as Pipeline.Column,
    canDrop: ({ source }) => model.isColumn(source.data),
    onChange: (mutate) => Obj.change(pipeline, (obj) => mutate(obj.columns)),
  });

  return <Board.Content {...props} id='pipeline' eventHandler={eventHandler} Tile={PipelineColumn} />;
});

PipelineColumns.displayName = PIPELINE_COLUMNS_NAME;

//
// Toolbar
//

const PIPELINE_TOOLBAR_NAME = 'Pipeline.Toolbar';

export const PipelineToolbar = composable<HTMLDivElement, ToolbarRootProps>(({ children, ...props }, forwardedRef) => {
  const { t } = useTranslation(meta.id);
  const { onAddColumn } = usePipeline(PIPELINE_TOOLBAR_NAME);

  return (
    <Toolbar.Root {...composableProps(props)} ref={forwardedRef}>
      <Toolbar.IconButton icon='ph--plus--regular' iconOnly label={t('add-column.label')} onClick={onAddColumn} />
    </Toolbar.Root>
  );
});

PipelineToolbar.displayName = PIPELINE_TOOLBAR_NAME;

//
// Project
//

export const PipelineComponent = {
  Root: PipelineRoot,
  Content: PipelineContent,
  Columns: PipelineColumns,
  Toolbar: PipelineToolbar,
};

export { usePipeline };

export type { ItemProps, PipelineContextValue, PipelineRootProps, PipelineContentProps, PipelineColumnsProps };
