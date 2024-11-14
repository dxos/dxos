//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { useIntentDispatcher, type LayoutContainerProps } from '@dxos/app-framework';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { SpaceAction } from '@dxos/plugin-space';
import { create, fullyQualifiedId, getSpace, Filter, useQuery } from '@dxos/react-client/echo';
import { useAttention } from '@dxos/react-ui-attention';
import { StackItemContent } from '@dxos/react-ui-stack/next';
import {
  Table,
  type TableController,
  Toolbar,
  type ToolbarAction,
  useTableModel,
  type TableType,
  initializeTable,
} from '@dxos/react-ui-table';
import { ViewProjection } from '@dxos/schema';

import { TableAction } from '../types';

// TODO(zantonio): Factor out, copied this from MarkdownPlugin.
export const sectionToolbarLayout = 'bs-[--rail-action] bg-[--sticky-bg] sticky block-start-0 transition-opacity';

// TODO(zantonio): Move toolbar action handling to a more appropriate location.
const TableContainer = ({ role, table }: LayoutContainerProps<{ table: TableType; role?: string }>) => {
  const { hasAttention } = useAttention(fullyQualifiedId(table));
  const dispatch = useIntentDispatcher();
  const space = getSpace(table);

  useEffect(() => {
    if (space && table && !table?.view) {
      initializeTable({ space, table });
    }
  }, [space, table, table?.view]);

  const schema = useMemo(
    () => (table.view ? space?.db.schemaRegistry.getSchema(table.view.query.__typename) : undefined),
    [space, table.view],
  );
  const queriedObjects = useQuery(space, schema ? Filter.schema(schema) : () => false, undefined, [schema]);
  const filteredObjects = useGlobalFilteredObjects(queriedObjects);

  const handleDeleteRow = useCallback(
    (_row: number, object: any) => {
      void dispatch({ action: SpaceAction.REMOVE_OBJECT, data: { object } });
    },
    [dispatch],
  );

  const handleDeleteColumn = useCallback((fieldId: string) => {
    void dispatch({
      action: TableAction.DELETE_COLUMN,
      data: { table, fieldId } satisfies TableAction.DeleteColumn,
    });
  }, []);

  const projection = useMemo(() => {
    if (!schema || !table.view) {
      return;
    }

    return new ViewProjection(schema, table.view);
  }, [schema, table.view]);

  const tableRef = useRef<TableController>(null);

  const model = useTableModel({
    table,
    projection,
    objects: filteredObjects,
    onDeleteRow: handleDeleteRow,
    onDeleteColumn: handleDeleteColumn,
    onCellUpdate: (cell) => tableRef.current?.update?.(cell),
    onRowOrderChanged: () => tableRef.current?.update?.(),
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
        case 'add-row': {
          if (schema && space) {
            space.db.add(create(schema, {}));
          }
          break;
        }
      }
    },
    [onThreadCreate, space, schema],
  );

  return (
    <StackItemContent toolbar>
      <Toolbar.Root onAction={handleAction} classNames={!hasAttention && 'opacity-20'}>
        <Toolbar.Separator />
        <Toolbar.Actions />
      </Toolbar.Root>
      <Table.Root role={role}>
        <Table.Main key={table.id} ref={tableRef} model={model} />
      </Table.Root>
    </StackItemContent>
  );
};

export default TableContainer;
