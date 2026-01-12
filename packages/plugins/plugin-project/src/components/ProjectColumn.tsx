//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useMemo, useState } from 'react';

import { Obj, Query, Type } from '@dxos/echo';
import { getQueryTarget, resolveSchemaWithRegistry } from '@dxos/plugin-space';
import { Filter, getSpace, isSpace, useQuery } from '@dxos/react-client/echo';
import { useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-mosaic';
import { CardStack, StackItem, cardStackDefaultInlineSizeRem, cardStackHeading } from '@dxos/react-ui-stack';
import { ProjectionModel } from '@dxos/schema';
import { type Project } from '@dxos/types';

import { meta } from '../meta';

import { useProject } from './Project';

export type ProjectColumnProps = {
  column: Project.Column;
};

// TODO(thure): Duplicates a lot of the same boilerplate as Kanban columns; is there an opportunity to DRY these out?
// TODO(wittjosiah): Support column DnD reordering.
// TODO(wittjosiah): Support item DnD reordering (ordering needs to be stored on the view presentation collection).
export const ProjectColumn = ({ column }: ProjectColumnProps) => {
  const { t } = useTranslation(meta.id);
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
      return Query.fromAst(JSON.parse(JSON.stringify(Obj.getSnapshot(view).query.ast)));
    }
  }, [JSON.stringify(view?.query.ast)]);

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
  const projectionModel = useMemo(
    () => (schema && view ? new ProjectionModel(Type.toJsonSchema(schema), view.projection) : undefined),
    [schema, view?.projection],
  );

  if (!view) {
    return null;
  }

  return (
    <CardStack.Root asChild>
      <StackItem.Root item={view} size={cardStackDefaultInlineSizeRem} focusIndicatorVariant='group'>
        <CardStack.Content classNames='density-fine border border-separator rounded-md'>
          <StackItem.Heading classNames={[cardStackHeading, 'min-is-0 pli-cardSpacingChrome']} separateOnScroll>
            <h3 className='grow truncate'>{column.name ?? t('untitled view title')}</h3>
          </StackItem.Heading>
          <CardStack.Stack id={view.id} itemsCount={sortedItems.length}>
            {sortedItems.map((liveMarker) => {
              const item = liveMarker as unknown as Obj.Any;
              return (
                <CardStack.Item key={item.id} asChild>
                  <StackItem.Root item={item} focusIndicatorVariant='group'>
                    <Card.Root>
                      <Item item={item} projectionModel={projectionModel} />
                    </Card.Root>
                  </StackItem.Root>
                </CardStack.Item>
              );
            })}
          </CardStack.Stack>
          {/* TODO(wittjosiah): Support adding items.
          <CardStack.Footer>
            <IconButton
              icon='ph--plus--regular'
              label={t('add card label')}
              classNames='is-full'
              onClick={() => onAddItem?.(schema)}
            />
          </CardStack.Footer> */}
        </CardStack.Content>
      </StackItem.Root>
    </CardStack.Root>
  );
};
