//
// Copyright 2024 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { useCallback, useMemo, useRef } from 'react';

import { createIntent, useAppGraph, useIntentDispatcher } from '@dxos/app-framework';
import { isMutable, toJsonSchema } from '@dxos/echo-schema';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { SpaceAction } from '@dxos/plugin-space/types';
import { useClient } from '@dxos/react-client';
import { live, fullyQualifiedId, getSpace, Filter, useQuery, useSchema } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import {
  Table,
  type TableController,
  type TableFeatures,
  TablePresentation,
  TableToolbar,
  type TableType,
  useTableModel,
} from '@dxos/react-ui-table';
import { ViewProjection } from '@dxos/schema';

import { TableAction } from '../types';

const TableContainer = ({ role, table }: { role?: string; table: TableType }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const tableRef = useRef<TableController>(null);

  const client = useClient();
  const space = getSpace(table);
  const schema = useSchema(client, space, table.view?.target?.query.typename);
  const queriedObjects = useQuery(space, schema ? Filter.type(schema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(queriedObjects);

  const { graph } = useAppGraph();
  const customActions = useMemo(() => {
    return Rx.make((get) => {
      const actions = get(graph.actions(fullyQualifiedId(table)));
      const nodes = actions.filter((action) => action.properties.disposition === 'toolbar');
      return { nodes, edges: nodes.map((node) => ({ source: 'root', target: node.id })) };
    });
  }, [graph]);

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

    return new ViewProjection(toJsonSchema(schema), table.view.target!);
  }, [schema, table.view?.target]);

  const features: Partial<TableFeatures> = useMemo(
    () => ({
      selection: { enabled: true, mode: 'multiple' },
      dataEditable: true,
      schemaEditable: schema && isMutable(schema),
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

  const handleSave = useCallback(() => {
    model?.saveView();
  }, [model]);

  const presentation = useMemo(() => (model ? new TablePresentation(model) : undefined), [model]);

  return (
    <StackItem.Content role={role} toolbar>
      <TableToolbar
        attendableId={fullyQualifiedId(table)}
        classNames='border-be border-separator'
        customActions={customActions}
        onAdd={handleInsertRow}
        onSave={handleSave}
      />
      <Table.Root role={role}>
        <Table.Main key={table.id} ref={tableRef} model={model} presentation={presentation} schema={schema} />
      </Table.Root>
    </StackItem.Content>
  );
};

export default TableContainer;
