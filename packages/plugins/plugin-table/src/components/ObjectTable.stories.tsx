//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { useCallback, useEffect, useState } from 'react';

import { Filter, useSpaces, useQuery, create } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ObjectTable } from './ObjectTable';
import { Toolbar } from './Toolbar';
import { createEmptyTable } from './testing';
import { TableType } from '../types';

const Story = () => {
  const spaces = useSpaces();
  const [table, setTable] = useState<TableType | undefined>();
  const objects = useQuery(spaces[spaces.length - 1], Filter.schema(TableType));
  useEffect(() => {
    if (objects.length) {
      setTable(objects[0]);
    }
  }, [objects]);

  const handleAction = useCallback(
    (action: { type: string }) => {
      switch (action.type) {
        case 'on-thread-create': {
          console.log('Thread creation triggered');
          break;
        }
        case 'add-row': {
          const lastSpace = spaces[spaces.length - 1];
          if (table?.schema && lastSpace) {
            lastSpace.db.add(create(table.schema, {}));
          }
          break;
        }
      }
    },
    [table, spaces],
  );

  if (!table) {
    return null;
  }

  return (
    <div>
      <div className='border-b border-separator'>
        <Toolbar.Root onAction={handleAction}>
          <Toolbar.Actions />
          <Toolbar.Separator />
          <Toolbar.Extended />
        </Toolbar.Root>
      </div>
      <div className='relative is-full max-is-max min-is-0 min-bs-0'>
        <ObjectTable table={table} />
      </div>
    </div>
  );
};

export default {
  title: 'plugin-table/ObjectTable-Next',
  component: ObjectTable,
  decorators: [
    withClientProvider({
      types: [TableType],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: ({ space }) => {
        space.db.add(createEmptyTable());
      },
    }),
    withTheme,
    withLayout({ fullscreen: true, tooltips: true }),
  ],
  render: Story,
};

export const Default = {};
