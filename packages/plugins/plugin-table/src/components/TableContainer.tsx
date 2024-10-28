//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { useIntentDispatcher, type LayoutContainerProps } from '@dxos/app-framework';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { create, fullyQualifiedId, getSpace, Filter, useQuery } from '@dxos/react-client/echo';
import { useAttention } from '@dxos/react-ui-attention';
import { mx } from '@dxos/react-ui-theme';

import { Table } from './Table';
import { Toolbar, type ToolbarAction } from './Toolbar';
import { useTableModel } from '../hooks';
import { type TableType } from '../types';

// TODO(zantonio): Factor out, copied this from MarkdownPlugin.
export const sectionToolbarLayout = 'bs-[--rail-action] bg-[--sticky-bg] sticky block-start-0 transition-opacity';

// TODO(zantonio): Move toolbar action handling to a more appropriate location.
const TableContainer = ({ role, table }: LayoutContainerProps<{ table: TableType; role?: string }>) => {
  const { hasAttention } = useAttention(fullyQualifiedId(table));
  const dispatch = useIntentDispatcher();
  const space = getSpace(table);
  const queriedObjects = useQuery(space, table.schema ? Filter.schema(table.schema) : () => false, undefined, [
    table.schema,
  ]);
  const filteredObjects = useGlobalFilteredObjects(queriedObjects);
  const onDeleteRow = useCallback((row: any) => space?.db.remove(row), [space]);
  const model = useTableModel({ table, objects: filteredObjects, onDeleteRow });

  const onThreadCreate = useCallback(() => {
    void dispatch({
      // TODO(Zan): We shouldn't hardcode the action ID.
      action: 'dxos.org/plugin/thread/action/create',
      data: {
        subject: table,
        cursor: Date.now().toString(), // TODO(Zan): Consider a more appropriate anchor format.
      },
    });
  }, [dispatch, table]);

  const handleAction = useCallback(
    (action: ToolbarAction) => {
      switch (action.type) {
        case 'comment': {
          onThreadCreate();
          break;
        }
      }
      switch (action.type) {
        case 'add-row': {
          if (table.schema && space) {
            space.db.add(create(table.schema, {}));
          }
        }
      }
    },
    [onThreadCreate, table.schema, space],
  );

  return (
    <div role='none' className={role === 'article' ? 'row-span-2 grid grid-rows-subgrid' : undefined}>
      <Toolbar.Root
        onAction={handleAction}
        classNames={mx(
          role === 'section'
            ? ['z-[2] group-focus-within/section:visible', !hasAttention && 'invisible', sectionToolbarLayout]
            : 'border-be border-separator',
        )}
      >
        <Toolbar.Separator />
        <Toolbar.Actions />
      </Toolbar.Root>
      <div
        className={mx(
          role === 'article' && 'relative is-full max-is-max min-is-0 min-bs-0',
          role === 'section' && 'grid cols-1 rows-[1fr_min-content] min-bs-0 !bg-[--surface-bg]',
          role === 'slide' && 'bs-full overflow-auto grid place-items-center',
        )}
      >
        <Table key={table.id} model={model} />
      </div>
    </div>
  );
};

export default TableContainer;
