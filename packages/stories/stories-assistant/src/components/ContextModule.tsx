//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Filter } from '@dxos/echo';
import { Assistant, useContextBinder } from '@dxos/plugin-assistant';
import { useQuery } from '@dxos/react-client/echo';

import { type ComponentProps } from './types';
import { Stack, StackItem } from '@dxos/react-ui-stack';
import { Toolbar } from '@dxos/react-ui';
import { Surface } from '@dxos/app-framework/ui';

export const ContextModule = ({ space }: ComponentProps) => {
  const chats = useQuery(space?.db, Filter.type(Assistant.Chat));
  const binder = useContextBinder(chats.at(-1)?.queue.target);
  const objects = binder?.getObjects() ?? [];

  return (
    <StackItem.Content toolbar>
      <Toolbar.Root>
        <Toolbar.Text className='flex-1 text-center'>Chat Context Objects</Toolbar.Text>
      </Toolbar.Root>
      <Stack orientation='vertical' size='contain' rail={false} itemsCount={objects.length}>
        {objects.map((object) => (
          <StackItem.Root key={object.id} item={object}>
            <Surface.Surface role='section' limit={1} data={{ subject: object }} />
          </StackItem.Root>
        ))}
      </Stack>
    </StackItem.Content>
  );
};
