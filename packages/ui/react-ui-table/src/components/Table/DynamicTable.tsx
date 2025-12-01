//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useRef } from 'react';

import { type Type } from '@dxos/echo';
import { type JsonSchemaType } from '@dxos/echo/internal';
import { type ThemedClassName, useDefaultValue } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { ProjectionModel } from '@dxos/schema';

import { useTableModel } from '../../hooks';
import { type TableFeatures, TablePresentation, type TableRowAction } from '../../model';
import { type TablePropertyDefinition, getBaseSchema, makeDynamicTable } from '../../util';

import { Table, type TableController } from './Table';

export type DynamicTableProps<T extends Type.Entity.Any = Type.Entity.Any> = ThemedClassName<{
  schema?: T;
  name?: string; // TODO(burdon): Remove?
  rows: any[];
  properties?: TablePropertyDefinition[];
  jsonSchema?: JsonSchemaType;
  features?: Partial<TableFeatures>;
  rowActions?: TableRowAction[];
  onRowClick?: (row: any) => void;
  onRowAction?: (actionId: string, datum: any) => void;
}>;

/**
 * Properties define both the schema and display characteristics of the table columns.
 */
// TODO(burdon): Instead of creating component variants, create helpers/hooks that normalize the props.
// TODO(burdon): Warning: Cannot update a component (`DynamicTable`) while rendering a different component (`DynamicTable`).
export const DynamicTable = <T extends Type.Entity.Any = Type.Entity.Any>({
  classNames,
  schema,
  name = 'example.com/dynamic-table', // Rmove default or make random; this will lead to type collisions.
  rows,
  properties,
  jsonSchema: _jsonSchema,
  rowActions,
  onRowClick,
  onRowAction,
  ...props
}: DynamicTableProps<T>) => {
  // TODO(burdon): Remove variance from the props (should be normalized externally; possibly via hooks).
  const { jsonSchema } = useMemo(
    () => getBaseSchema({ typename: name, properties, jsonSchema: _jsonSchema, schema }),
    [name, properties, _jsonSchema, schema],
  );

  const { object, projection } = useMemo(() => makeDynamicTable({ jsonSchema, properties }), [jsonSchema, properties]);

  const tableRef = useRef<TableController>(null);
  const handleCellUpdate = useCallback((cell: any) => {
    tableRef.current?.update?.(cell);
  }, []);

  const handleRowOrderChange = useCallback(() => {
    tableRef.current?.update?.();
  }, []);

  const features = useDefaultValue(
    props.features,
    () =>
      ({
        selection: { enabled: false },
        dataEditable: false,
      }) as const,
  );

  const projectionModel = useMemo(() => {
    if (jsonSchema && projection) {
      const model = new ProjectionModel(jsonSchema, projection);
      model.normalizeView();
      return model;
    }
  }, [jsonSchema, projection]);

  const model = useTableModel({
    rows,
    object,
    projection: projectionModel,
    features,
    rowActions,
    onCellUpdate: handleCellUpdate,
    onRowOrderChange: handleRowOrderChange,
    onRowAction,
  });

  const presentation = useMemo(() => {
    if (model) {
      return new TablePresentation(model);
    }
  }, [model]);

  // TODO(burdon): Do we need the outer divs?
  return (
    <div role='none' className={mx('is-full bs-full grow grid', classNames)}>
      <div role='none' className='grid min-bs-0 overflow-hidden'>
        <Table.Root>
          <Table.Main<T>
            ref={tableRef}
            model={model}
            presentation={presentation}
            ignoreAttention
            onRowClick={onRowClick}
          />
        </Table.Root>
      </div>
    </div>
  );
};
