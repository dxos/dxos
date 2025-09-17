//
// Copyright 2025 DXOS.org
//
import React from 'react';

import { Surface } from '@dxos/app-framework';
import { type AnyEchoObject, type Ref } from '@dxos/echo-schema';
import { useClient } from '@dxos/react-client';
import { Filter, getSpace, useQuery, useSchema } from '@dxos/react-client/echo';
import { Card, CardStack, StackItem, cardStackHeading } from '@dxos/react-ui-stack';
import { type View } from '@dxos/schema';

export type ViewCollectionColumnProps = {
  viewRef: Ref<View>;
};

export const ViewCollectionColumn = ({ viewRef }: ViewCollectionColumnProps) => {
  // Resolve the view from the viewRef using useQuery
  const client = useClient();
  const view = viewRef.target;

  // Resolve the view.query to its items
  const schema = useSchema(client, space, view?.query.typename);
  const items = useQuery(space, schema ? Filter.type(schema) : Filter.nothing());

  if (!view || !view.query || !items) {
    return null;
  }

  return (
    <CardStack.Root asChild>
      <StackItem.Root item={{ id: viewRef.dxn.toString() }} size={20} focusIndicatorVariant='group'>
        <CardStack.Content>
          <StackItem.Heading classNames={cardStackHeading} separateOnScroll>
            {view.name ?? 'Untitled view'}
          </StackItem.Heading>
          <CardStack.Stack id={viewRef.dxn.toString()} itemsCount={items.length}>
            {items.map((liveMarker) => {
              const item = liveMarker as unknown as AnyEchoObject;
              return (
                <CardStack.Item asChild key={item.id}>
                  <StackItem.Root item={item} focusIndicatorVariant='group'>
                    <Card.StaticRoot>
                      <Surface role='card--intrinsic' limit={1} data={{ subject: item, projection: view.projection }} />
                    </Card.StaticRoot>
                  </StackItem.Root>
                </CardStack.Item>
              );
            })}
          </CardStack.Stack>
        </CardStack.Content>
      </StackItem.Root>
    </CardStack.Root>
  );
};
