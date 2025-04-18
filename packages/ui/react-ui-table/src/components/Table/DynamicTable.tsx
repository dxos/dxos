//
// Copyright 2025 DXOS.org
//

import React, { useRef, useMemo, useCallback } from 'react';

import { type BaseSchema, type JsonSchemaType } from '@dxos/echo-schema';
import { useDefaultValue } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { Table, type TableController } from './Table';
import { useTableModel } from '../../hooks';
import { type TableFeatures, TablePresentation, type TableRowAction } from '../../model';
import { makeDynamicTable, type TablePropertyDefinition } from '../../util';

type DynamicTableProps = {
  data: any[];
  properties?: TablePropertyDefinition[];
  jsonSchema?: JsonSchemaType;
  echoSchema?: BaseSchema;
  tableName?: string;
  classNames?: string;
  rowActions?: TableRowAction[];
  onRowClicked?: (row: any) => void;
  onRowAction?: (actionId: string, datum: any) => void;
  features?: Partial<TableFeatures>;
};

/**
 * A dynamic table component that renders data using the specified properties.
 * Properties define both the schema and display characteristics of the table columns.
 */
export const DynamicTable = ({
  data,
  properties,
  jsonSchema,
  echoSchema,
  classNames,
  tableName = 'com.example/dynamic_table',
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
    onCellUpdate: handleCellUpdate,
    onRowOrderChanged: handleRowOrderChanged,
    rowActions,
    onRowAction,
  });

  const presentation = useMemo(() => {
    if (model) {
      return new TablePresentation(model);
    }
  }, [model]);

  return (
    <div className={mx('is-full bs-full grow grid', classNames)}>
      <div className='grid min-bs-0 overflow-hidden'>
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
