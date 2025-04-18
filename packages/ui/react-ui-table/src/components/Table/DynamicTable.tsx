//
// Copyright 2025 DXOS.org
//

import React, { useRef, useMemo, useCallback } from 'react';

import { type BaseSchema, type JsonSchemaType } from '@dxos/echo-schema';
import { type ThemedClassName, useDefaultValue } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { Table, type TableController } from './Table';
import { useTableModel } from '../../hooks';
import { type TableFeatures, TablePresentation, type TableRowAction } from '../../model';
import { makeDynamicTable, type TablePropertyDefinition } from '../../util';

type DynamicTableProps = ThemedClassName<{
  tableName?: string;
  data: any[];
  properties?: TablePropertyDefinition[];
  jsonSchema?: JsonSchemaType;
  echoSchema?: BaseSchema;
  features?: Partial<TableFeatures>;
  rowActions?: TableRowAction[];
  onRowClicked?: (row: any) => void;
  onRowAction?: (actionId: string, datum: any) => void;
}>;

/**
 * A dynamic table component that renders data using the specified properties.
 * Properties define both the schema and display characteristics of the table columns.
 */
// TODO(burdon): Warning: Cannot update a component (`DynamicTable`) while rendering a different component (`DynamicTable`).
export const DynamicTable = ({
  classNames,
  tableName = 'com.example/dynamic_table',
  data,
  properties,
  jsonSchema,
  echoSchema,
  rowActions,
  onRowClicked,
  onRowAction,
  ...props
}: DynamicTableProps) => {
  const { table, viewProjection } = useMemo(() => {
    return makeDynamicTable({ typename: tableName, properties, jsonSchema, echoSchema });
  }, [tableName, properties, jsonSchema]);

  const tableRef = useRef<TableController>(null);
  const handleCellUpdate = useCallback((cell: any) => {
    tableRef.current?.update?.(cell);
  }, []);

  const handleRowOrderChanged = useCallback(() => {
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

  const model = useTableModel({
    table,
    objects: data,
    projection: viewProjection,
    features,
    rowActions,
    onCellUpdate: handleCellUpdate,
    onRowOrderChanged: handleRowOrderChanged,
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
          <Table.Main
            ref={tableRef}
            model={model}
            presentation={presentation}
            onRowClicked={onRowClicked}
            ignoreAttention
          />
        </Table.Root>
      </div>
    </div>
  );
};
