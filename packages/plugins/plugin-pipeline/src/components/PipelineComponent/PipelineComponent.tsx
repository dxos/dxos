//
// Copyright 2025 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { type FC, type PropsWithChildren } from 'react';

import { Obj } from '@dxos/echo';
import type { MenuActions } from '@dxos/react-ui-menu';
import { Board, type BoardModel, useBoard, useEventHandlerAdapter } from '@dxos/react-ui-mosaic';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Util from '@dxos/react-ui/Util';
import { type ProjectionModel } from '@dxos/schema';
import { type Pipeline } from '@dxos/types';

import { meta } from '#meta';

import { PipelineColumn } from './PipelineColumn.tsx';
import { PIPELINE_ROOT, PipelineRootContext, usePipeline } from './PipelineContext.tsx';

type ItemProps = {
  item: Obj.Unknown;
  projectionModel?: ProjectionModel;
  /** The card's menu, for the item to contribute its actions to. */
  menu?: MenuActions;
};

//
// Root
//

export type PipelineContextValue = {
  Item: FC<ItemProps>;
  // TODO(wittjosiah): Support adding items.
  //  If the created item doesn't match the current query, it will not be visible.
  // TODO(wittjosiah): onAddItem?: (schema: Schema.Schema.AnyNoContext) => void;
  onAddColumn?: () => void;
};

type PipelineRootProps = PropsWithChildren<PipelineContextValue>;

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

const PipelineContent = Util.slottable<HTMLDivElement, PipelineContentProps>(
  ({ asChild, model, children, ...props }, forwardedRef) => {
    return (
      <Board.Root model={model}>
        <ark.div asChild={asChild} {...Util.composableProps(props)} ref={forwardedRef}>
          {children}
        </ark.div>
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

const PipelineColumns = Util.composable<HTMLDivElement, PipelineColumnsProps>(({ pipeline, ...props }) => {
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
    onChange: (mutate) => Obj.update(pipeline, (pipeline) => mutate(pipeline.columns)),
  });

  return <Board.Content {...props} eventHandler={eventHandler} Tile={PipelineColumn} />;
});

PipelineColumns.displayName = PIPELINE_COLUMNS_NAME;

//
// Toolbar
//

const PIPELINE_TOOLBAR_NAME = 'Pipeline.Toolbar';

export const PipelineToolbar = Util.composable<HTMLDivElement, Toolbar.RootProps>(
  ({ children, ...props }, forwardedRef) => {
    const { t } = Hooks.useTranslation(meta.profile.key);
    const { onAddColumn } = usePipeline(PIPELINE_TOOLBAR_NAME);

    return (
      <Toolbar.Root {...Util.composableProps(props)} ref={forwardedRef}>
        <Button.Button icon='ph--plus--regular' iconOnly label={t('add-column.label')} onClick={onAddColumn} />
      </Toolbar.Root>
    );
  },
);

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

export type { ItemProps, PipelineColumnsProps, PipelineContentProps, PipelineRootProps };
