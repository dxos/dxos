//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo, useRef, useState } from 'react';

import { resolveSchemaWithRegistry } from '@dxos/app-toolkit/Query';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useComposedRefs } from '@dxos/react-hooks';
import { ActionMenu, useMenuActions } from '@dxos/react-ui-menu';
import { Board, Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import * as Block from '@dxos/react-ui/Block';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Focus from '@dxos/react-ui/Focus';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Panel from '@dxos/react-ui/Panel';
import { ProjectionModel, createEchoChangeCallback } from '@dxos/schema';
import { type Pipeline } from '@dxos/types';

import { meta } from '#meta';

import { type ItemProps } from './PipelineComponent.tsx';
import { usePipeline } from './PipelineContext.tsx';

//
// PipelineColumn
//

const PIPELINE_COLUMN_NAME = 'PipelineColumn';

export type PipelineColumnProps = Pick<MosaicTileProps<Pipeline.Column>, 'classNames' | 'location' | 'data' | 'debug'>;

// TODO(wittjosiah): Support item DnD reordering (ordering needs to be stored on the view presentation collection).
export const PipelineColumn = ({ data: column, location, classNames, debug }: PipelineColumnProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
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

  Hooks.useAsyncEffect(async () => {
    if (!query || !db) {
      return;
    }

    const type = await resolveSchemaWithRegistry(db, query.ast);
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
        <Panel.Header>
          <Board.Column.Header
            classNames='_opacity-10'
            label={column.name || t('untitled-column.title')}
            dragHandleRef={setDragHandle}
          />
        </Panel.Header>
        <Panel.Body asChild>
          <Board.Column.Body data={column} Tile={PipelineTile} />
        </Panel.Body>
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
    // The card's own menu has no items; the item contributes them.
    const menu = useMenuActions();

    return (
      <Mosaic.Tile asChild id={data.id} data={data} location={location} debug={debug}>
        <Focus.Item asChild>
          <Card.Root classNames={classNames} ref={composedRef}>
            <Card.Header>
              <Block.Block>
                <Icon.Icon icon={icon} />
              </Block.Block>
              <Card.Title>{Obj.getLabel(data, { fallback: 'typename' })}</Card.Title>
              {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
              <Block.Block rail='end'>
                <ActionMenu>
                  <Button.Button iconOnly variant='ghost' icon='ph--dots-three-vertical--regular' label='Actions' />
                </ActionMenu>
              </Block.Block>
            </Card.Header>
            <Card.Body>
              <Item {...itemProps} menu={menu} />
            </Card.Body>
          </Card.Root>
        </Focus.Item>
      </Mosaic.Tile>
    );
  },
);

ItemTile.displayName = ITEM_TILE_NAME;
