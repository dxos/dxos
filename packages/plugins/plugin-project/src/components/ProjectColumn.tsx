//
// Copyright 2025 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import type * as Schema from 'effect/Schema';
import React, { forwardRef, useMemo, useRef, useState } from 'react';

import { Obj, Query, Type } from '@dxos/echo';
import { getQueryTarget, resolveSchemaWithRegistry } from '@dxos/plugin-space';
import { Filter, getSpace, isSpace, useObject, useQuery } from '@dxos/react-client/echo';
import { useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Card, Focus, Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { ProjectionModel, createEchoChangeCallback } from '@dxos/schema';
import { type Project } from '@dxos/types';

import { meta } from '../meta';

import { type ItemProps, useProject } from './Project';

export type ProjectColumnProps = {
  column: Project.Column;
};

//
// ItemTile
//

type ItemTileProps = Pick<MosaicTileProps<Obj.Unknown>, 'classNames' | 'location' | 'data' | 'debug'> & {
  itemProps: ItemProps;
};

const ItemTile = forwardRef<HTMLDivElement, ItemTileProps>(
  ({ classNames, data, location, debug, itemProps }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
    const { Item } = useProject('ItemTile');

    return (
      <Mosaic.Tile asChild id={data.id} data={data} location={location} debug={debug}>
        <Focus.Group asChild>
          <Card.Root classNames={classNames} onClick={() => rootRef.current?.focus()} ref={composedRef}>
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

ItemTile.displayName = 'ItemTile';

//
// ProjectColumn
//

// TODO(thure): Duplicates a lot of the same boilerplate as Kanban columns; is there an opportunity to DRY these out?
// TODO(wittjosiah): Support column DnD reordering.
// TODO(wittjosiah): Support item DnD reordering (ordering needs to be stored on the view presentation collection).
export const ProjectColumn = ({ column }: ProjectColumnProps) => {
  const { t } = useTranslation(meta.id);
  // Subscribe to the view target for reactivity.
  const [viewSnapshot] = useObject(column.view);
  const view = column.view.target;
  const space = getSpace(view);
  const { Item } = useProject('ViewColumn');
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
    if (!query || !space) {
      return;
    }

    const schema = await resolveSchemaWithRegistry(space.db.schemaRegistry, query.ast);
    setSchema(() => schema);
  }, [space, query]);

  const queryTarget = getQueryTarget(query.ast, space);
  const items = useQuery(queryTarget, query);
  const sortedItems = useMemo(() => {
    // TODO(burdon): Hack to reverse queue.
    return isSpace(queryTarget) ? items : [...items.reverse()];
  }, [queryTarget, items]);
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

  return (
    <Focus.Group asChild>
      <div className='grid bs-full card-default-width overflow-hidden bg-deckSurface grid-rows-[min-content_1fr] density-fine border border-separator rounded-md'>
        <Card.Toolbar>
          <Card.DragHandle />
          <Card.Title>{column.name ?? t('untitled view title')}</Card.Title>
          <Card.Menu />
        </Card.Toolbar>
        <Mosaic.Container asChild axis='vertical' withFocus>
          <Mosaic.Viewport axis='vertical' padding>
            <Mosaic.Stack axis='vertical' items={sortedItems} getId={(item) => item.id} Tile={Tile} />
          </Mosaic.Viewport>
        </Mosaic.Container>
      </div>
    </Focus.Group>
  );
};
