//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import type * as Types from 'effect/Types';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { type JsonSchema, type Type } from '@dxos/echo';
import * as Hooks from '@dxos/react-ui/Hooks';
import type * as Util from '@dxos/react-ui/Util';
import { type ProjectionModel } from '@dxos/schema';

import { useTableModel } from '../../hooks/index.ts';
import { type TableFeatures, TablePresentation, type TableRowAction } from '../../model/index.ts';
import { type Table as TableType } from '../../types/index.ts';
import { type TablePropertyDefinition, getBaseSchema, makeDynamicTable } from '../../util/index.ts';
import { Table, type TableController } from './Table.tsx';

export type DynamicTableProps<T extends Type.AnyEntity = Type.AnyEntity> = Util.ThemedClassName<{
  type?: T;
  name?: string; // TODO(burdon): Remove?
  rows: any[];
  properties?: TablePropertyDefinition[];
  jsonSchema?: Types.DeepMutable<JsonSchema.JsonSchema>;
  features?: Partial<TableFeatures>;
  rowActions?: TableRowAction[];
  /** Rows selected when the table mounts; see `useTableModel`'s `selection`. */
  selection?: readonly string[];
  onRowClick?: (row: any) => void;
  onRowAction?: (actionId: string, datum: any) => void;
  onSelectionChanged?: (selection: string[]) => void;
}>;

/**
 * Properties define both the schema and display characteristics of the table columns.
 */
// TODO(burdon): Instead of creating component variants, create helpers/hooks that normalize the props.
// TODO(burdon): Warning: Cannot update a component (`DynamicTable`) while rendering a different component (`DynamicTable`).
export const DynamicTable = <T extends Type.AnyEntity = Type.AnyEntity>({
  classNames,
  type: typeProp,
  name = 'com.example.dynamicTable', // Remove default or make random; this will lead to type collisions.
  rows,
  properties,
  jsonSchema: jsonSchemaProp,
  rowActions,
  selection,
  onRowClick,
  onRowAction,
  onSelectionChanged,
  ...props
}: DynamicTableProps<T>) => {
  const registry = useContext(RegistryContext);
  const [dynamicTable, setDynamicTable] = useState<{ object: TableType.Table; projection: ProjectionModel }>();

  // Keyed on the properties' CONTENTS, not their identity: a caller that builds the array inline
  // rebuilds the table — and with it every cell — on each of its own renders, which reads as a flicker
  // whenever something outside the table changes (a selection, a filter). The whole property is in the
  // key, so a changed title, size, sort or config still rebuilds.
  const propertiesKey = useMemo(() => JSON.stringify(properties ?? []), [properties]);
  // TODO(burdon): Remove variance from the props (should be normalized externally; possibly via hooks).
  const { type } = useMemo(
    () => getBaseSchema({ typename: name, properties, jsonSchema: jsonSchemaProp, type: typeProp }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name, propertiesKey, jsonSchemaProp, typeProp],
  );

  useEffect(() => {
    setDynamicTable(makeDynamicTable({ registry, type, properties }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry, type, propertiesKey]);

  const tableRef = useRef<TableController>(null);
  const handleCellUpdate = useCallback((cell: any) => {
    tableRef.current?.update?.(cell);
  }, []);

  const handleRowOrderChange = useCallback(() => {
    tableRef.current?.update?.();
  }, []);

  const features = Hooks.useDefaultValue(
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
    selection,
    onCellUpdate: handleCellUpdate,
    onRowOrderChange: handleRowOrderChange,
    onRowAction,
    onSelectionChanged,
  });

  const presentation = useMemo(() => {
    if (model) {
      return new TablePresentation(registry, model);
    }
  }, [registry, model]);

  return (
    <Table.Root ref={tableRef}>
      <Table.Content
        classNames={classNames}
        model={model}
        presentation={presentation}
        ignoreAttention
        onRowClick={onRowClick}
      />
    </Table.Root>
  );
};
