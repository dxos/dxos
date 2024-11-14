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
import { ViewProjection } from '@dxos/schema';

import { type TableController, TableMain } from './TableMain';
import { Toolbar, type ToolbarAction } from './Toolbar';
import { useTableModel } from '../hooks';
import { TableAction, type TableType } from '../types';
import { initializeTable } from '../util';

// TODO(zantonio): Factor out, copied this from MarkdownPlugin.
export const sectionToolbarLayout = 'bs-[--rail-action] bg-[--sticky-bg] sticky block-start-0 transition-opacity';

type TableContainerProps = LayoutContainerProps<{ table: TableType }>;

// TODO(zantonio): Move toolbar action handling to a more appropriate location.
const TableContainer = ({ table }: TableContainerProps) => {
  const attendableId = fullyQualifiedId(table);
  const { hasAttention } = useAttention(attendableId);
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
      <Toolbar.Root onAction={handleAction} classNames={['attention-surface', !hasAttention && 'opacity-0.5']}>
        <Toolbar.Separator />
        <Toolbar.Actions />
      </Toolbar.Root>
      <div role='none' className='flex flex-col gap-px'>
        {model && <TableMain key={table.id} attendableId={attendableId} ref={tableRef} model={model} />}
        <span role='none' className='flex-1 min-bs-0 attention-surface' />
      </div>
    </StackItemContent>
  );
};

export default TableContainer;
