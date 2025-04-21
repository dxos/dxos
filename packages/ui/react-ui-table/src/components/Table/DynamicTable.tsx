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
import { getBaseSchems as getBaseSchema, makeDynamicTable, type TablePropertyDefinition } from '../../util';

type DynamicTableProps = ThemedClassName<{
  name?: string; // TODO(burdon): Remove?
  rows: any[];
  properties?: TablePropertyDefinition[];
  jsonSchema?: JsonSchemaType;
  schema?: BaseSchema;
  features?: Partial<TableFeatures>;
  rowActions?: TableRowAction[];
  onRowClick?: (row: any) => void;
  onRowAction?: (actionId: string, datum: any) => void;
}>;

/**
 * Properties define both the schema and display characteristics of the table columns.
 *
 * @deprecated Use Table.
 */
// TODO(burdon): Instead of creating component variants, create helpers/hooks that normalize the props.
// TODO(burdon): Warning: Cannot update a component (`DynamicTable`) while rendering a different component (`DynamicTable`).
export const DynamicTable = ({
  classNames,
  name = 'example.com/dynamic-table', // Rmove default or make random; this will lead to type collisions.
  rows,
  properties,
  jsonSchema,
  schema,
  rowActions,
  onRowClick,
  onRowAction,
  ...props
}: DynamicTableProps) => {
  const { table, projection } = useMemo(() => {
    // TODO(burdon): Remove variance from the props (should be normalized externally; possibly via hooks).
    const props = getBaseSchema({ typename: name, properties, jsonSchema, schema });
    return makeDynamicTable({ ...props, properties });
  }, [name, properties, schema, jsonSchema]);

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
    rows,
    projection,
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
            ignoreAttention
            onRowClick={onRowClick}
          />
        </Table.Root>
      </div>
    </div>
  );
};
