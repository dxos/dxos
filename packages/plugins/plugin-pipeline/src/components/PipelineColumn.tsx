//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import type * as Schema from 'effect/Schema';
import React, { forwardRef, useMemo, useRef, useState } from 'react';

import { Obj, Query, Type } from '@dxos/echo';
import { resolveSchemaWithRegistry } from '@dxos/plugin-space';
import { Filter, getSpace, useObject } from '@dxos/react-client/echo';
import { useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Board, Card, Focus, Mosaic, type MosaicTileProps, useBoard } from '@dxos/react-ui-mosaic';
import { ProjectionModel, createEchoChangeCallback } from '@dxos/schema';
import { type Pipeline } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { meta } from '../meta';

import { type ItemProps, usePipeline } from './PipelineComponent';

//
// PipelineColumn
//

const PIPELINE_COLUMN_NAME = 'PipelineColumn';

export type PipelineColumnProps = Pick<MosaicTileProps<Pipeline.Column>, 'classNames' | 'location' | 'data' | 'debug'>;

// TODO(wittjosiah): Support item DnD reordering (ordering needs to be stored on the view presentation collection).
export const PipelineColumn = ({ data: column, location, classNames, debug }: PipelineColumnProps) => {
  const { t } = useTranslation(meta.id);
  const { model } = useBoard<Pipeline.Column, Obj.Unknown>(PIPELINE_COLUMN_NAME);
  const items = useAtomValue(model.items(column));
  // Subscribe to the view target for reactivity.
  const [viewSnapshot] = useObject(column.view);
  const view = column.view.target;
  const space = getSpace(view);
  const { Item } = usePipeline(PIPELINE_COLUMN_NAME);
  const [schema, setSchema] = useState<Schema.Schema.AnyNoContext>();
  const query = useMemo(() => {
    if (!view) {
      return Query.select(Filter.nothing());
    } else {
      // NOTE: Snapshot is required to prevent signal read in prohibited scope.
      // TODO(wittjosiah): Without stringify, filter.filters remains a proxied array.
      return Query.fromAst(JSON.parse(JSON.stringify(viewSnapshot?.query.ast)));
    }
  }, [JSON.stringify(viewSnapshot?.query.ast)]);

  useAsyncEffect(async () => {
    if (!query || !space?.db) {
      return;
    }

    const schema = await resolveSchemaWithRegistry(space.db.schemaRegistry, query.ast);
    setSchema(() => schema);
  }, [space, query]);

  const projectionModel = useMemo(() => {
    if (!schema || !view) {
      return undefined;
    }

    // For mutable schemas (EchoSchema), use the live jsonSchema reference for reactivity.
    const jsonSchema = Type.isMutable(schema) ? schema.jsonSchema : Type.toJsonSchema(schema);
    const change = createEchoChangeCallback(view, Type.isMutable(schema) ? schema : undefined);
    return new ProjectionModel({ view, baseSchema: jsonSchema, change });
  }, [schema, view]);

  const Tile = useMemo(() => {
    return forwardRef<HTMLDivElement, Pick<MosaicTileProps<Obj.Unknown>, 'classNames' | 'location' | 'data' | 'debug'>>(
      (props, ref) => <ItemTile {...props} ref={ref} itemProps={{ item: props.data, projectionModel }} />,
    );
  }, [Item, projectionModel]);

  if (!view) {
    return null;
  }

  const dragHandleRef = useRef<HTMLButtonElement>(null);

  return (
    <Board.Column.Root
      data={column}
      location={location}
      classNames={classNames}
      debug={debug}
      dragHandleRef={dragHandleRef}
    >
      <div
        role='none'
        data-testid='board-column'
        className={mx('group/column grid bs-full overflow-hidden grid-rows-[var(--rail-action)_1fr]', classNames)}
      >
        <Board.Column.Header
          classNames='border-be border-separator'
          label={column.name ?? t('untitled view title')}
          dragHandleRef={dragHandleRef}
        />
        <Board.Column.Body data={column} Tile={Tile} />
      </div>
    </Board.Column.Root>
  );
};

PipelineColumn.displayName = PIPELINE_COLUMN_NAME;

//
// ItemTile
//

const ITEM_TILE_NAME = 'ItemTile';

type ItemTileProps = Pick<MosaicTileProps<Obj.Unknown>, 'classNames' | 'location' | 'data' | 'debug'> & {
  itemProps: ItemProps;
};

const ItemTile = forwardRef<HTMLDivElement, ItemTileProps>(
  ({ classNames, data, location, debug, itemProps }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
    const { Item } = usePipeline(ITEM_TILE_NAME);

    return (
      <Mosaic.Tile asChild id={data.id} data={data} location={location} debug={debug}>
        <Focus.Group asChild>
          <Card.Root classNames={classNames} ref={composedRef}>
            <Card.Toolbar>
              <Card.DragHandle />
              <Card.Title>{Obj.getLabel(data)}</Card.Title>
              <Card.Menu />
            </Card.Toolbar>
            <Card.Content>
              <Item {...itemProps} />
            </Card.Content>
          </Card.Root>
        </Focus.Group>
      </Mosaic.Tile>
    );
  },
);

ItemTile.displayName = ITEM_TILE_NAME;
