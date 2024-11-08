//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useIntentDispatcher, type LayoutContainerProps } from '@dxos/app-framework';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { create, fullyQualifiedId, getSpace, Filter, useQuery } from '@dxos/react-client/echo';
import { useAttention } from '@dxos/react-ui-attention';
import { mx } from '@dxos/react-ui-theme';
import { ViewProjection } from '@dxos/schema';

import { Table } from './Table';
import { Toolbar, type ToolbarAction } from './Toolbar';
import { useTableIntialisation, useTableModel } from '../hooks';
import { TableAction, type TableType } from '../types';

// TODO(zantonio): Factor out, copied this from MarkdownPlugin.
export const sectionToolbarLayout = 'bs-[--rail-action] bg-[--sticky-bg] sticky block-start-0 transition-opacity';

// TODO(zantonio): Move toolbar action handling to a more appropriate location.
const TableContainer = ({ role, table }: LayoutContainerProps<{ table: TableType; role?: string }>) => {
  const { hasAttention } = useAttention(fullyQualifiedId(table));
  const dispatch = useIntentDispatcher();
  useTableIntialisation(table);
  const space = getSpace(table);
  const schema = useMemo(
    () => (table.view ? space?.db.schemaRegistry.getSchema(table.view.query.__typename) : undefined),
    [space, table.view],
  );
  const queriedObjects = useQuery(space, schema ? Filter.schema(schema) : () => false, undefined, [schema]);
  const filteredObjects = useGlobalFilteredObjects(queriedObjects);

  const handleDeleteRow = useCallback((row: any) => space?.db.remove(row), [space]);
  const handleDeleteColumn = useCallback((property: string) => {
    void dispatch({
      action: TableAction.DELETE_COLUMN,
      data: { table, property } satisfies TableAction.DeleteColumn,
    });
  }, []);

  const projection = useMemo(() => {
    if (!schema || !table.view) {
      return;
    }

    return new ViewProjection(schema, table.view);
  }, [schema, table.view]);

  const model = useTableModel({
    table,
    projection,
    objects: filteredObjects,
    onDeleteRow: handleDeleteRow,
    onDeleteColumn: handleDeleteColumn,
  });

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
          if (schema && space) {
            space.db.add(create(schema, {}));
          }
        }
      }
    },
    [onThreadCreate, space, schema],
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
      <Table.Viewport role={role}>
        <Table.Table key={table.id} model={model} />
      </Table.Viewport>
    </div>
  );
};

export default TableContainer;
