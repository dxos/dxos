//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useRef } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { SpaceAction } from '@dxos/plugin-space/types';
import { ThreadAction } from '@dxos/plugin-thread/types';
import { create, fullyQualifiedId, getSpace, Filter, useQuery } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import {
  Table,
  type TableController,
  TablePresentation,
  TableToolbar,
  type TableToolbarAction,
  type TableType,
  useTableModel,
} from '@dxos/react-ui-table';
import { ViewProjection } from '@dxos/schema';

import { TableAction } from '../types';

// TODO(zantonio): Move toolbar action handling to a more appropriate location.
const TableContainer = ({ role, table }: { table: TableType; role?: string }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const space = getSpace(table);

  const schema = useMemo(
    () => (table.view?.target ? space?.db.schemaRegistry.getSchema(table.view.target.query.type) : undefined),
    [space, table.view?.target],
  );
  const queriedObjects = useQuery(space, schema ? Filter.schema(schema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(queriedObjects);

  const handleInsertRow = useCallback(() => {
    if (schema && space) {
      space.db.add(create(schema, {}));
    }
  }, [schema, space]);

  const handleDeleteRows = useCallback(
    (_row: number, objects: any[]) => {
      void dispatch(createIntent(SpaceAction.RemoveObjects, { objects }));
    },
    [dispatch],
  );

  const handleDeleteColumn = useCallback((fieldId: string) => {
    void dispatch(createIntent(TableAction.DeleteColumn, { table, fieldId }));
  }, []);

  const projection = useMemo(() => {
    if (!schema || !table.view?.target) {
      return;
    }

    return new ViewProjection(schema, table.view.target!);
  }, [schema, table.view?.target]);

  const tableRef = useRef<TableController>(null);

  const model = useTableModel({
    table,
    projection,
    objects: filteredObjects,
    onInsertRow: handleInsertRow,
    onDeleteRows: handleDeleteRows,
    onDeleteColumn: handleDeleteColumn,
    onCellUpdate: (cell) => tableRef.current?.update?.(cell),
    onRowOrderChanged: () => tableRef.current?.update?.(),
  });

  const presentation = useMemo(() => (model ? new TablePresentation(model) : undefined), [model]);

  const onThreadCreate = useCallback(() => {
    // TODO(Zan): Consider a more appropriate anchor format.
    void dispatch(createIntent(ThreadAction.Create, { subject: table, cursor: Date.now().toString() }));
  }, [dispatch, table]);

  const handleAction = useCallback(
    (action: TableToolbarAction) => {
      switch (action.properties.type) {
        case 'comment': {
          onThreadCreate();
          break;
        }
        case 'add-row': {
          handleInsertRow();
          break;
        }
        case 'save-view': {
          model?.saveView();
          break;
        }
      }
    },
    [onThreadCreate, space, schema, handleInsertRow, dispatch, table, model],
  );

  return (
    <StackItem.Content toolbar role={role}>
      <TableToolbar onAction={handleAction} attendableId={fullyQualifiedId(table)} />
      <Table.Root role={role}>
        <Table.Main key={table.id} ref={tableRef} model={model} presentation={presentation} />
      </Table.Root>
    </StackItem.Content>
  );
};

export default TableContainer;
