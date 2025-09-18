//
// Copyright 2025 DXOS.org
//
import React, { useMemo, useState } from 'react';

import { type Obj, Type } from '@dxos/echo';
import { useClient } from '@dxos/react-client';
import { Filter, getSpace, useQuery, useSchema } from '@dxos/react-client/echo';
import { IconButton, ToggleGroup, ToggleGroupIconItem, useTranslation } from '@dxos/react-ui';
import { Card, CardStack, StackItem, cardStackHeading } from '@dxos/react-ui-stack';
import { ProjectionModel, type View } from '@dxos/schema';

import { meta } from '../meta';

import { useProject } from './Project';

export type ViewColumnProps = {
  view: View;
};

// This duplicates a lot of the same boilerplate as Kanban columns; is there an opportunity to DRY these out?
export const ViewColumn = ({ view }: ViewColumnProps) => {
  // Resolve the view from the view using useQuery
  const client = useClient();
  const space = getSpace(view);
  const { t } = useTranslation(meta.id);
  const { Item } = useProject('ViewColumn');
  const [tab, setTab] = useState<'enumerating' | 'editing'>('enumerating');

  // Resolve the view.query to its items
  const schema = useSchema(client, space, view?.query.typename);
  const items = useQuery(space, schema ? Filter.type(schema) : Filter.nothing());
  const projectionModel = useMemo(
    () => (schema ? new ProjectionModel(Type.toJsonSchema(schema), view.projection) : undefined),
    [schema, view.projection],
  );

  if (!view || !view.query || !items) {
    return null;
  }

  return (
    <CardStack.Root asChild>
      <StackItem.Root item={view} size={20} focusIndicatorVariant='group'>
        <CardStack.Content>
          <StackItem.Heading classNames={cardStackHeading} separateOnScroll>
            <h3 className='grow'>{view.name ?? t('untitled view title')}</h3>
            <ToggleGroup
              type='single'
              value={tab}
              onValueChange={(nextValue: 'enumerating' | 'editing') => setTab(nextValue)}
            >
              <ToggleGroupIconItem
                iconOnly
                variant='ghost'
                value='enumerating'
                label={t('enumerating tab label')}
                icon='ph--rows-plus-bottom--regular'
                density='fine'
              />
              <ToggleGroupIconItem
                iconOnly
                variant='ghost'
                value='editing'
                label={t('edit tab label')}
                icon='ph--pencil-simple-line--regular'
                density='fine'
              />
            </ToggleGroup>
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
          <CardStack.Footer>
            <IconButton icon='ph--plus--regular' label={t('add card label')} classNames='is-full' />
          </CardStack.Footer>
        </CardStack.Content>
      </StackItem.Root>
    </CardStack.Root>
  );
};
