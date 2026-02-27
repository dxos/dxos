//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import type * as Types from 'effect/Types';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { type Type } from '@dxos/echo';
import { type JsonSchema } from '@dxos/echo';
import { type ThemedClassName, useDefaultValue } from '@dxos/react-ui';
import { type ProjectionModel } from '@dxos/schema';
import { mx } from '@dxos/ui-theme';

import { useTableModel } from '../../hooks';
import { type TableFeatures, TablePresentation, type TableRowAction } from '../../model';
import { type Table as TableType } from '../../types';
import { type TablePropertyDefinition, getBaseSchema, makeDynamicTable } from '../../util';

import { Table, type TableController } from './Table';

export type DynamicTableProps<T extends Type.Entity.Any = Type.Entity.Any> = ThemedClassName<{
  schema?: T;
  name?: string; // TODO(burdon): Remove?
  rows: any[];
  properties?: TablePropertyDefinition[];
  jsonSchema?: Types.DeepMutable<JsonSchema.JsonSchema>;
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
  const registry = useContext(RegistryContext);
  const [dynamicTable, setDynamicTable] = useState<{ object: TableType.Table; projection: ProjectionModel }>();

  // TODO(burdon): Remove variance from the props (should be normalized externally; possibly via hooks).
  const { jsonSchema } = useMemo(
    () => getBaseSchema({ typename: name, properties, jsonSchema: _jsonSchema, schema }),
    [name, properties, _jsonSchema, schema],
  );

  useEffect(() => {
    setDynamicTable(makeDynamicTable({ registry, jsonSchema, properties }));
  }, [registry, jsonSchema, properties]);

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

  const model = useTableModel({
    rows,
    object: dynamicTable?.object,
    projection: dynamicTable?.projection,
    features,
    rowActions,
    onCellUpdate: handleCellUpdate,
    onRowOrderChange: handleRowOrderChange,
    onRowAction,
  });

  const presentation = useMemo(() => {
    if (model) {
      return new TablePresentation(registry, model);
    }
  }, [registry, model]);

  // TODO(burdon): Do we need the outer divs?
  return (
    <div role='none' className={mx('w-full h-full grow grid', classNames)}>
      <div role='none' className='grid min-h-0 overflow-hidden'>
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
