//
// Copyright 2025 DXOS.org
//

import { type RefObject, useCallback, useMemo, useRef } from 'react';

import { type Database, type Type } from '@dxos/echo';
import { isMutable } from '@dxos/echo/internal';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { faker } from '@dxos/random';
import { Filter, useQuery, useSchema } from '@dxos/react-client/echo';
import { useClientProvider } from '@dxos/react-client/testing';
import { type ProjectionModel, getTypenameFromQuery } from '@dxos/schema';

import { type TableController } from '../components';
import { useAddRow, useProjectionModel, useTableModel } from '../hooks';
import { type TableModel, TablePresentation } from '../model';
import { Table } from '../types';

faker.seed(0); // NOTE(ZaymonFC): Required for smoke tests.

export type TestTableModel<T extends Type.Entity.Any = Type.Entity.Any> = {
  schema: T | undefined;
  table: Table.Table | undefined;
  projection: ProjectionModel | undefined;
  tableRef: RefObject<TableController | null>;
  model: TableModel | undefined;
  presentation: TablePresentation | undefined;
  db: Database.Database | undefined;
  handleInsertRow: () => void;
  handleSaveView: () => void;
  handleDeleteRows: (rowIndex: number, objects: any[]) => void;
  handleDeleteColumn: (fieldId: string) => void;
};

/**
 * Custom hook to create and manage a test table model for storybook demonstrations.
 * Provides table data, schema, and handlers for table operations.
 */
export const useTestTableModel = <T extends Type.Entity.Any = Type.Entity.Any>(): TestTableModel<T> => {
  const { space } = useClientProvider();
  const db = space?.db;

  const tables = useQuery(space?.db, Filter.type(Table.Table));
  const table = tables.at(0);
  const typename = table?.view.target?.query ? getTypenameFromQuery(table.view.target.query.ast) : undefined;
  const schema = useSchema<T>(space?.db, typename);
  const projection = useProjectionModel(schema, table);

  const features = useMemo(
    () => ({
      selection: { enabled: true, mode: 'multiple' as const },
      dataEditable: true,
      schemaEditable: schema && isMutable(schema),
    }),
    [schema],
  );

  const objects = useQuery(db, schema ? Filter.type(schema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  const tableRef = useRef<TableController>(null);
  const handleCellUpdate = useCallback((cell: any) => {
    tableRef.current?.update?.(cell);
  }, []);

  const handleRowOrderChange = useCallback(() => {
    tableRef.current?.update?.();
  }, []);

  const addRow = useAddRow({ db, schema });

  const handleDeleteRows = useCallback(
    (_: number, objects: any[]) => {
      for (const object of objects) {
        db?.remove(object);
      }
    },
    [db],
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
    object: table,
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
    db,
    handleInsertRow,
    handleSaveView,
    handleDeleteRows,
    handleDeleteColumn,
  };
};
