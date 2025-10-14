//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useMemo, useState } from 'react';

import { Obj, Query, Type } from '@dxos/echo';
import { useClient } from '@dxos/react-client';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Card, CardStack, StackItem, cardStackHeading } from '@dxos/react-ui-stack';
import { ProjectionModel, type View } from '@dxos/schema';

import { getQueryTarget, resolveSchemaWithClientAndSpace } from '../helpers';
import { meta } from '../meta';

import { useProject } from './Project';

export type ViewColumnProps = {
  view: View;
};

// TODO(thure): Duplicates a lot of the same boilerplate as Kanban columns; is there an opportunity to DRY these out?
// TODO(wittjosiah): Support column DnD reordering.
// TODO(wittjosiah): Support item DnD reordering (ordering needs to be stored on the view presentation collection).
export const ViewColumn = ({ view }: ViewColumnProps) => {
  const client = useClient();
  const space = getSpace(view);
  const { t } = useTranslation(meta.id);
  const { Item } = useProject('ViewColumn');
  const [schema, setSchema] = useState<Schema.Schema.AnyNoContext>();
  const query = useMemo(() => {
    if (!view) {
      return Query.select(Filter.nothing());
    } else {
      // NOTE: Snapshot is required to prevent signal read in prohibited scope.
      return Query.fromAst(Obj.getSnapshot(view).query.ast);
    }
  }, [JSON.stringify(view?.query.ast)]);

  useAsyncEffect(async () => {
    if (!query || !space) {
      return;
    }

    const schema = await resolveSchemaWithClientAndSpace(client, space, query.ast);
    setSchema(() => schema);
  }, [client, space, query]);

  const queryTarget = getQueryTarget(query.ast, space);
  const items = useQuery(queryTarget, query);
  const projectionModel = useMemo(
    () => (schema ? new ProjectionModel(Type.toJsonSchema(schema), view.projection) : undefined),
    [schema, view.projection],
  );

  if (!view) {
    return null;
  }

  return (
    <CardStack.Root asChild>
      <StackItem.Root item={view} size={20} focusIndicatorVariant='group'>
        <CardStack.Content classNames='density-fine' footer={false}>
          <StackItem.Heading classNames={[cardStackHeading, 'min-is-0 pli-cardSpacingChrome']} separateOnScroll>
            <h3 className='grow truncate'>{view.name ?? t('untitled view title')}</h3>
          </StackItem.Heading>
          <CardStack.Stack id={view.id} itemsCount={items.length}>
            {items.map((liveMarker) => {
              const item = liveMarker as unknown as Obj.Any;
              return (
                <CardStack.Item asChild key={item.id}>
                  <StackItem.Root item={item} focusIndicatorVariant='group'>
                    <Card.StaticRoot>
                      <Item item={item} projectionModel={projectionModel} />
                    </Card.StaticRoot>
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
