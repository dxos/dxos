//
// Copyright 2025 DXOS.org
//

import React, { useRef, useMemo, useCallback } from 'react';

import { mx } from '@dxos/react-ui-theme';

import { Table, type TableController } from './Table';
import { useTableModel } from '../../hooks';
import { TablePresentation, type TableRowAction } from '../../model';
import { makeDynamicTable, type TablePropertyDefinition } from '../../util';

type DynamicTableProps = {
  data: any[];
  properties: TablePropertyDefinition[];
  tableName?: string;
  classNames?: string;
  onSelectionChanged?: (selectedItems: string[]) => void;
  rowActions?: TableRowAction[];
  onRowAction?: (actionId: string, datum: any) => void;
};

/**
 * A dynamic table component that renders data using the specified properties.
 * Properties define both the schema and display characteristics of the table columns.
 */
export const DynamicTable = ({
  data,
  properties,
  classNames,
  tableName = 'com.example/dynamic_table',
  onSelectionChanged,
  rowActions,
  onRowAction,
}: DynamicTableProps) => {
  // TODO(ZaymonFC): Consider allowing the user to supply a schema directly instead of deriving it from
  //  the properties array. (Both should be viable).
  const { table, viewProjection } = useMemo(() => {
    return makeDynamicTable(tableName, properties);
  }, [tableName, properties]);

  const tableRef = useRef<TableController>(null);
  const handleCellUpdate = useCallback((cell: any) => {
    tableRef.current?.update?.(cell);
  }, []);

  const handleRowOrderChanged = useCallback(() => {
    tableRef.current?.update?.();
  }, []);

  const model = useTableModel({
    table,
    objects: data,
    projection: viewProjection,
    onSelectionChanged,
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
          <Table.Main ref={tableRef} model={model} presentation={presentation} ignoreAttention />
        </Table.Root>
      </div>
    </div>
  );
};
