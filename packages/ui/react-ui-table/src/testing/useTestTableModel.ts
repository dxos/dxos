//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import { type RefObject, useCallback, useMemo, useRef } from 'react';

import { isMutable } from '@dxos/echo/internal';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { faker } from '@dxos/random';
import { type Client, useClient } from '@dxos/react-client';
import { Filter, type Space, useQuery, useSchema } from '@dxos/react-client/echo';
import { useClientProvider } from '@dxos/react-client/testing';
import { type ProjectionModel, getTypenameFromQuery } from '@dxos/schema';

import { type TableController } from '../components';
import { useAddRow, useProjectionModel, useTableModel } from '../hooks';
import { type TableModel, TablePresentation } from '../model';
import { Table } from '../types';

faker.seed(0); // NOTE(ZaymonFC): Required for smoke tests.

export type TestTableModel = {
  schema: Schema.Schema.AnyNoContext | undefined;
  table: Table.Table | undefined;
  projection: ProjectionModel | undefined;
  tableRef: RefObject<TableController | null>;
  model: TableModel | undefined;
  presentation: TablePresentation | undefined;
  space: Space | undefined;
  client: Client | undefined;
  handleInsertRow: () => void;
  handleSaveView: () => void;
  handleDeleteRows: (rowIndex: number, objects: any[]) => void;
  handleDeleteColumn: (fieldId: string) => void;
};

/**
 * Custom hook to create and manage a test table model for storybook demonstrations.
 * Provides table data, schema, and handlers for table operations.
 */
export const useTestTableModel = (): TestTableModel => {
  const client = useClient();
  const { space } = useClientProvider();

  const tables = useQuery(space, Filter.type(Table.Table));
  const table = tables.at(0);
  const typename = table?.view.target?.query ? getTypenameFromQuery(table.view.target.query.ast) : undefined;
  const schema = useSchema(client, space, typename);
  const projection = useProjectionModel(schema, table);

  const features = useMemo(
    () => ({
      selection: { enabled: true, mode: 'multiple' as const },
      dataEditable: true,
      schemaEditable: schema && isMutable(schema),
    }),
    [schema],
  );

  const objects = useQuery(space, schema ? Filter.type(schema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  const tableRef = useRef<TableController>(null);
  const handleCellUpdate = useCallback((cell: any) => {
    tableRef.current?.update?.(cell);
  }, []);

  const handleRowOrderChange = useCallback(() => {
    tableRef.current?.update?.();
  }, []);

  const addRow = useAddRow({ space, schema });

  const handleDeleteRows = useCallback(
    (_: number, objects: any[]) => {
      for (const object of objects) {
        space?.db.remove(object);
      }
    },
    [space],
  );

  const handleDeleteColumn = useCallback(
    (fieldId: string) => {
      if (projection) {
        projection.deleteFieldProjection(fieldId);
      }
    },
    [projection],
  );

  const model = useTableModel({
    table,
    projection,
    features,
    rows: filteredObjects,
    onInsertRow: addRow,
    onDeleteRows: handleDeleteRows,
    onDeleteColumn: handleDeleteColumn,
    onCellUpdate: handleCellUpdate,
    onRowOrderChange: handleRowOrderChange,
  });

  const handleInsertRow = useCallback(() => {
    const insertResult = model?.insertRow();
    tableRef.current?.handleInsertRowResult?.(insertResult);
  }, [model]);

  const handleSaveView = useCallback(() => {
    model?.saveView();
  }, [model]);

  const presentation = useMemo(() => {
    if (model) {
      return new TablePresentation(model);
    }
  }, [model]);

  return {
    schema,
    table,
    projection,
    tableRef,
    model,
    presentation,
    space,
    client,
    handleInsertRow,
    handleSaveView,
    handleDeleteRows,
    handleDeleteColumn,
  };
};
