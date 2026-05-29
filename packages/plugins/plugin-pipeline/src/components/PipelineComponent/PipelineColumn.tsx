//
// Copyright 2025 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import React, { forwardRef, useMemo, useRef, useState } from 'react';

import { resolveSchemaWithRegistry } from '@dxos/app-toolkit/query';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Panel, Toolbar, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui';
import { Menu } from '@dxos/react-ui-menu';
import { Board, Focus, Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { ProjectionModel, createEchoChangeCallback } from '@dxos/schema';
import { type Pipeline } from '@dxos/types';

import { meta } from '#meta';

import { type ItemProps, usePipeline } from './PipelineComponent';

//
// PipelineColumn
//

const PIPELINE_COLUMN_NAME = 'PipelineColumn';

export type PipelineColumnProps = Pick<MosaicTileProps<Pipeline.Column>, 'classNames' | 'location' | 'data' | 'debug'>;

// TODO(wittjosiah): Support item DnD reordering (ordering needs to be stored on the view presentation collection).
export const PipelineColumn = ({ data: column, location, classNames, debug }: PipelineColumnProps) => {
  const { t } = useTranslation(meta.id);
  const [dragHandle, setDragHandle] = useState<HTMLButtonElement | null>(null);
  // Subscribe to the view target for reactivity.
  const [viewSnapshot] = useObject(column.view);
  const view = column.view.target;
  const db = view && Obj.getDatabase(view);
  const { Item } = usePipeline(PIPELINE_COLUMN_NAME);
  const [type, setType] = useState<Type.AnyEntity>();
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
    if (!query || !db) {
      return;
    }

    const type = await resolveSchemaWithRegistry(db.schemaRegistry, query.ast);
    setType(() => type);
  }, [db, query]);

  const projectionModel = useMemo(() => {
    if (!type || !view) {
      return undefined;
    }

    // Use the live jsonSchema reference for reactivity.
    const change = createEchoChangeCallback(view, Type.getDatabase(type) != null ? type : undefined);
    return new ProjectionModel({ view, baseSchema: type.jsonSchema, change });
  }, [type, view]);

  const PipelineTile = useMemo(() => {
    return forwardRef<HTMLDivElement, Pick<MosaicTileProps<Obj.Unknown>, 'classNames' | 'location' | 'data' | 'debug'>>(
      (props, ref) => <ItemTile {...props} itemProps={{ item: props.data, projectionModel }} ref={ref} />,
    );
  }, [projectionModel]);

  if (!view) {
    return null;
  }

  return (
    <Panel.Root asChild>
      <Board.Column.Root
        debug={debug}
        data={column}
        location={location}
        classNames={classNames}
        dragHandle={dragHandle}
      >
        <Panel.Toolbar asChild>
          <Board.Column.Header
            classNames='_opacity-10'
            label={column.name || t('untitled-view.title')}
            dragHandleRef={setDragHandle}
          />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Board.Column.Body data={column} Tile={PipelineTile} />
        </Panel.Content>
      </Board.Column.Root>
    </Panel.Root>
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
    const icon = Obj.getIcon(data)?.icon ?? 'ph--circle-dashed--regular';

    return (
      <Menu.Root>
        <Mosaic.Tile asChild id={data.id} data={data} location={location} debug={debug}>
          <Focus.Item asChild>
            <Card.Root classNames={classNames} ref={composedRef}>
              <Card.Header>
                <Card.Icon icon={icon} />
                <Card.Title>{Obj.getLabel(data, { fallback: 'typename' })}</Card.Title>
                {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
                <Card.IconBlock padding>
                  <Menu.Trigger asChild>
                    <Toolbar.IconButton
                      iconOnly
                      variant='ghost'
                      icon='ph--dots-three-vertical--regular'
                      label='Actions'
                    />
                  </Menu.Trigger>
                  <Menu.Content />
                </Card.IconBlock>
              </Card.Header>
              <Card.Body>
                <Item {...itemProps} />
              </Card.Body>
            </Card.Root>
          </Focus.Item>
        </Mosaic.Tile>
      </Menu.Root>
    );
  },
);

ItemTile.displayName = ITEM_TILE_NAME;
