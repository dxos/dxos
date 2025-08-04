//
// Copyright 2025 DXOS.org
//

import { useCallback, useMemo, useRef } from 'react';

import { isMutable, toJsonSchema } from '@dxos/echo-schema';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { Filter, useQuery, useSchema } from '@dxos/react-client/echo';
import { useClientProvider } from '@dxos/react-client/testing';
import { DataType, ProjectionModel } from '@dxos/schema';

import { type TableController } from '../components';
import { useAddRow, useTableModel } from '../hooks';
import { TablePresentation } from '../model';

faker.seed(0); // NOTE(ZaymonFC): Required for smoke tests.

/**
 * Custom hook to create and manage a test table model for storybook demonstrations.
 * Provides table data, schema, and handlers for table operations.
 */
export const useTestTableModel = () => {
  const client = useClient();
  const { space } = useClientProvider();

  const views = useQuery(space, Filter.type(DataType.View));
  const view = useMemo(() => views.at(0), [views]);
  const schema = useSchema(client, space, view?.query.typename);
  const jsonSchema = useMemo(() => (schema ? toJsonSchema(schema) : undefined), [schema]);

  const projection = useMemo(() => {
    if (schema && view?.projection) {
      return new ProjectionModel(toJsonSchema(schema), view.projection);
    }
  }, [schema, view?.projection]);

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
    view,
    schema: jsonSchema,
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
    model?.insertRow();
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
    view,
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
