//
// Copyright 2024 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { useCallback, useMemo, useRef } from 'react';

import { createIntent, useAppGraph, useIntentDispatcher } from '@dxos/app-framework';
import { Filter, Type } from '@dxos/echo';
import { EchoSchema } from '@dxos/echo-schema';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { SpaceAction } from '@dxos/plugin-space/types';
import { useClient } from '@dxos/react-client';
import { fullyQualifiedId, getSpace, useQuery, useSchema } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import {
  Table,
  type TableController,
  type TableFeatures,
  TablePresentation,
  TableToolbar,
  useTableModel,
  useAddRow,
} from '@dxos/react-ui-table';
import { type DataType } from '@dxos/schema';

export type TableContainerProps = {
  role: string;
  view: DataType.View;
};

export const TableContainer = ({ role, view }: TableContainerProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const tableRef = useRef<TableController>(null);

  const client = useClient();
  const space = getSpace(view);
  const schema = useSchema(client, space, view.query.typename);
  const queriedObjects = useQuery(space, schema ? Filter.type(schema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(queriedObjects);

  const { graph } = useAppGraph();
  const customActions = useMemo(() => {
    return Rx.make((get) => {
      const actions = get(graph.actions(fullyQualifiedId(view)));
      const nodes = actions.filter((action) => action.properties.disposition === 'toolbar');
      return { nodes, edges: nodes.map((node) => ({ source: 'root', target: node.id })) };
    });
  }, [graph]);

  const addRow = useAddRow({ space, schema });

  const handleDeleteRows = useCallback(
    (_row: number, objects: any[]) => {
      void dispatch(createIntent(SpaceAction.RemoveObjects, { objects }));
    },
    [dispatch],
  );

  const handleDeleteColumn = useCallback(
    (fieldId: string) => {
      void dispatch(createIntent(SpaceAction.DeleteField, { view, fieldId }));
    },
    [dispatch],
  );

  const features: Partial<TableFeatures> = useMemo(
    () => ({
      selection: { enabled: true, mode: 'multiple' },
      dataEditable: true,
      schemaEditable: schema && Type.isMutable(schema),
    }),
    [],
  );

  const jsonSchema = useMemo(() => {
    if (schema instanceof EchoSchema) {
      return schema.jsonSchema;
    }
    return schema ? Type.toJsonSchema(schema) : undefined;
  }, [schema]);

  const model = useTableModel({
    view,
    schema: jsonSchema,
    features,
    rows: filteredObjects,
    onInsertRow: addRow,
    onDeleteRows: handleDeleteRows,
    onDeleteColumn: handleDeleteColumn,
    onCellUpdate: (cell) => tableRef.current?.update?.(cell),
    onRowOrderChange: () => tableRef.current?.update?.(),
  });

  const handleInsertRow = useCallback(() => {
    model?.insertRow();
  }, [model]);

  const handleSave = useCallback(() => {
    model?.saveView();
  }, [model]);

  const presentation = useMemo(() => (model ? new TablePresentation(model) : undefined), [model]);

  return (
    <StackItem.Content toolbar>
      <TableToolbar
        attendableId={fullyQualifiedId(view)}
        customActions={customActions}
        onAdd={handleInsertRow}
        onSave={handleSave}
      />
      <Table.Root role={role}>
        <Table.Main
          key={fullyQualifiedId(view)}
          ref={tableRef}
          client={client}
          model={model}
          presentation={presentation}
          schema={schema}
        />
      </Table.Root>
    </StackItem.Content>
  );
};

export default TableContainer;
