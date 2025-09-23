//
// Copyright 2025 DXOS.org
//
import React, { useMemo, useState } from 'react';

import { Obj, Query, Type } from '@dxos/echo';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { IconButton, ToggleGroup, ToggleGroupIconItem, useTranslation } from '@dxos/react-ui';
import { ViewEditor } from '@dxos/react-ui-form';
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
  const space = getSpace(view);
  const { t } = useTranslation(meta.id);
  const { Item, onAddItem } = useProject('ViewColumn');
  const [tab, setTab] = useState<'enumerating' | 'editing'>('enumerating');

  // Resolve the view.query to its items
  const schema = undefined;
  const items = useQuery(space, view?.query ? Query.fromAst(view.query) : Query.select(Filter.nothing()));
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
          <StackItem.Heading classNames={[cardStackHeading, 'pli-cardSpacingChrome']} separateOnScroll>
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
              />
              <ToggleGroupIconItem
                iconOnly
                variant='ghost'
                value='editing'
                label={t('editing tab label')}
                icon='ph--pencil-simple-line--regular'
              />
            </ToggleGroup>
          </StackItem.Heading>
          <>
            {tab === 'enumerating' ? (
              <>
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
                  <IconButton
                    icon='ph--plus--regular'
                    label={t('add card label')}
                    classNames='is-full'
                    onClick={() => onAddItem?.(schema)}
                  />
                </CardStack.Footer>
              </>
            ) : (
              <ViewEditor view={view} schema={schema} classNames='overflow-y-auto row-span-2' />
            )}
          </>
        </CardStack.Content>
      </StackItem.Root>
    </CardStack.Root>
  );
};
