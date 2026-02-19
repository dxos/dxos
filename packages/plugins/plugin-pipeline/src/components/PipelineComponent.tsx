//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry, useAtomValue } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import * as Schema from 'effect/Schema';
import React, { type FC, type PropsWithChildren, useMemo } from 'react';

import { Obj, Query } from '@dxos/echo';
import { AtomObj, AtomQuery } from '@dxos/echo-atom';
import { getQueryTarget } from '@dxos/plugin-space';
import { getSpace, isSpace } from '@dxos/react-client/echo';
import { Toolbar, type ToolbarRootProps, useTranslation } from '@dxos/react-ui';
import { Board, type BoardModel, useBoard, useEventHandlerAdapter } from '@dxos/react-ui-mosaic';
import { type ProjectionModel } from '@dxos/schema';
import { Pipeline, type Pipeline as PipelineType } from '@dxos/types';

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

type PipelineRootProps = PropsWithChildren<
  PipelineContextValue & {
    model: BoardModel<PipelineType.Column, Obj.Unknown>;
  }
>;

const PIPELINE_ROOT = 'Pipeline.Root';

const [PipelineRootContext, usePipeline] = createContext<PipelineContextValue>(PIPELINE_ROOT, {
  Item: itemNoOp,
});

const PipelineRoot = ({ model, children, ...contextValue }: PipelineRootProps) => (
  <PipelineRootContext {...contextValue}>
    <Board.Root model={model}>{children}</Board.Root>
  </PipelineRootContext>
);

PipelineRoot.displayName = PIPELINE_ROOT;

//
// usePipelineBoardModel
//

const emptyColumnsAtom = Atom.make(() => [] as PipelineType.Column[]);
const emptyItemsAtom = Atom.make(() => [] as Obj.Unknown[]);
const emptyPipelineModel: BoardModel<PipelineType.Column, Obj.Unknown> = {
  getColumnId: (data) => (data as PipelineType.Column).view.dxn.toString(),
  getItemId: (data) => (data as Obj.Unknown).id,
  isColumn: (obj: unknown): obj is PipelineType.Column => Schema.is(Pipeline.Column)(obj),
  isItem: (obj): obj is Obj.Unknown => Obj.isObject(obj),
  columns: emptyColumnsAtom,
  items: () => emptyItemsAtom,
  getColumns: () => [],
  getItems: () => [],
};

const usePipelineBoardModel = (
  pipeline: PipelineType.Pipeline | undefined,
  registry: Registry.Registry,
): BoardModel<PipelineType.Column, Obj.Unknown> =>
  useMemo<BoardModel<PipelineType.Column, Obj.Unknown>>(() => {
    if (pipeline == null) {
      return emptyPipelineModel;
    }
    const space = getSpace(pipeline);
    const columnsAtom = AtomObj.makeProperty(pipeline, 'columns');
    const columnAtomFamily = Atom.family<string, Atom.Atom<PipelineType.Column | undefined>>((viewKey: string) =>
      Atom.make((get) => {
        const columns = get(columnsAtom);
        return columns.find((c) => c.view.dxn.toString() === viewKey);
      }),
    );
    const itemsAtomFamily = Atom.family<string, Atom.Atom<Obj.Unknown[]>>((viewKey: string) =>
      Atom.make((get) => {
        const column = get(columnAtomFamily(viewKey));
        if (column == null) {
          return [];
        }
        const viewSnapshot = get(AtomObj.make(column.view));
        if (!viewSnapshot?.query?.ast) {
          return [];
        }
        const query = Query.fromAst(JSON.parse(JSON.stringify(viewSnapshot.query.ast)));
        const queryTarget = space ? getQueryTarget(query.ast, space) : undefined;
        if (!queryTarget) {
          return [];
        }
        const raw = get(AtomQuery.make(queryTarget, query));
        return isSpace(queryTarget) ? raw : [...raw].reverse();
      }),
    );
    return {
      getColumnId: (data) => (data as PipelineType.Column).view.dxn.toString(),
      getItemId: (data) => (data as Obj.Unknown).id,
      isColumn: (obj: unknown): obj is PipelineType.Column => Schema.is(Pipeline.Column)(obj),
      isItem: (obj: unknown): obj is Obj.Unknown => Obj.isObject(obj),
      columns: columnsAtom,
      items: (column) => itemsAtomFamily(column.view.dxn.toString()),
      getColumns: () => [...registry.get(columnsAtom)],
      getItems: (column) => registry.get(itemsAtomFamily(column.view.dxn.toString())) ?? [],
    };
  }, [pipeline, registry]);

//
// Content
//

const PIPELINE_CONTENT_NAME = 'Pipeline.Content';

type PipelineContentProps = {
  pipeline: PipelineType.Pipeline;
};

const PipelineContent = ({ pipeline }: PipelineContentProps) => {
  const { model } = useBoard(PIPELINE_CONTENT_NAME);
  const columns = useAtomValue(model.columns);
  const eventHandler = useEventHandlerAdapter<PipelineType.Column, Obj.Unknown>({
    id: pipeline.id,
    // TODO(wittjosiah): Cast because columns array is readonly.
    items: columns as any,
    getId: model.getColumnId,
    get: (data) => data as unknown as Obj.Unknown,
    make: (object) => object as unknown as PipelineType.Column,
    canDrop: ({ source }) => model.isColumn(source.data),
    onChange: (mutate) => Obj.change(pipeline, (p) => mutate(p.columns)),
  });

  return <Board.Content id='pipeline' eventHandler={eventHandler} Tile={PipelineColumn} />;
};

PipelineContent.displayName = PIPELINE_CONTENT_NAME;

//
// Toolbar
//

const PIPELINE_TOOLBAR_NAME = 'Pipeline.Toolbar';

export const PipelineToolbar = (props: ToolbarRootProps) => {
  const { t } = useTranslation(meta.id);
  const { onAddColumn } = usePipeline(PIPELINE_TOOLBAR_NAME);

  return (
    <Toolbar.Root {...props}>
      <Toolbar.IconButton icon='ph--plus--regular' iconOnly label={t('add column label')} onClick={onAddColumn} />
    </Toolbar.Root>
  );
};

PipelineToolbar.displayName = PIPELINE_TOOLBAR_NAME;

//
// Project
//

export const PipelineComponent = {
  Root: PipelineRoot,
  Content: PipelineContent,
  Toolbar: PipelineToolbar,
};

export { usePipeline, usePipelineBoardModel };

export type { ItemProps, PipelineContextValue, PipelineRootProps };
