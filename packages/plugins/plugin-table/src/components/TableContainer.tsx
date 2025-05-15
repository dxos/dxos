//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useRef } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { SpaceAction } from '@dxos/plugin-space/types';
import { ThreadAction } from '@dxos/plugin-thread/types';
import { useClient } from '@dxos/react-client';
import { live, fullyQualifiedId, getSpace, Filter, useQuery, useSchema, isMutable } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import {
  Table,
  type TableController,
  type TableFeatures,
  TablePresentation,
  TableToolbar,
  type TableToolbarAction,
  type TableType,
  useTableModel,
} from '@dxos/react-ui-table';
import { ViewProjection } from '@dxos/schema';

import { TableAction } from '../types';

// TODO(ZaymonFC): Move toolbar action handling to a more appropriate location.
const TableContainer = ({ role, table }: { role?: string; table: TableType }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const tableRef = useRef<TableController>(null);

  const client = useClient();
  const space = getSpace(table);
  const schema = useSchema(client, space, table.view?.target?.query.typename);
  const queriedObjects = useQuery(space, schema ? Filter.schema(schema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(queriedObjects);

  const handleThreadCreate = useCallback(() => {
    // TODO(Zan): Consider a more appropriate anchor format.
    void dispatch(createIntent(ThreadAction.Create, { subject: table, cursor: Date.now().toString() }));
  }, [dispatch, table]);

  const handleInsertRow = useCallback(() => {
    if (schema && space) {
      space.db.add(live(schema, {}));
    }
  }, [space, schema]);

  const handleDeleteRows = useCallback(
    (_row: number, objects: any[]) => {
      void dispatch(createIntent(SpaceAction.RemoveObjects, { objects }));
    },
    [dispatch],
  );

  const handleDeleteColumn = useCallback(
    (fieldId: string) => {
      void dispatch(createIntent(TableAction.DeleteColumn, { table, fieldId }));
    },
    [dispatch],
  );

  const projection = useMemo(() => {
    if (!schema || !table.view?.target) {
      return;
    }

    return new ViewProjection(Type.toJsonSchema(schema), table.view.target!);
  }, [schema, table.view?.target]);

  const features: Partial<TableFeatures> = useMemo(
    () => ({
      selection: { enabled: true, mode: 'multiple' },
      dataEditable: true,
      schemaEditable: isMutable(schema),
    }),
    [],
  );

  const model = useTableModel({
    table,
    projection,
    features,
    rows: filteredObjects,
    onInsertRow: handleInsertRow,
    onDeleteRows: handleDeleteRows,
    onDeleteColumn: handleDeleteColumn,
    onCellUpdate: (cell) => tableRef.current?.update?.(cell),
    onRowOrderChange: () => tableRef.current?.update?.(),
  });

  const presentation = useMemo(() => (model ? new TablePresentation(model) : undefined), [model]);

  const handleAction = useCallback(
    (action: TableToolbarAction) => {
      switch (action.properties.type) {
        case 'comment': {
          handleThreadCreate();
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
    [handleThreadCreate, handleInsertRow, model],
  );

  return (
    <StackItem.Content role={role} toolbar>
      <TableToolbar
        onAction={handleAction}
        attendableId={fullyQualifiedId(table)}
        classNames='border-be border-separator'
      />
      <Table.Root role={role}>
        <Table.Main key={table.id} ref={tableRef} model={model} presentation={presentation} />
      </Table.Root>
    </StackItem.Content>
  );
};

export default TableContainer;
