//
// Copyright 2025 DXOS.org
//

import { RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import type * as Types from 'effect/Types';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { type JsonSchema, type Type } from '@dxos/echo';
import { Button, type ThemedClassName, toLocalizedString, useDefaultValue, useTranslation } from '@dxos/react-ui';
import { type ProjectionModel } from '@dxos/schema';
import { mx } from '@dxos/ui-theme';

import { useTableModel } from '../../hooks';
import { type TableFeatures, type TableModel, TablePresentation, type TableRowAction } from '../../model';
import { translationKey } from '../../translations';
import { type Table as TableType } from '../../types';
import { type TablePropertyDefinition, getBaseSchema, makeDynamicTable } from '../../util';
import { Table, type TableController } from './Table';

export type DynamicTableProps<T extends Type.AnyEntity = Type.AnyEntity> = ThemedClassName<{
  type?: T;
  name?: string; // TODO(burdon): Remove?
  rows: any[];
  properties?: TablePropertyDefinition[];
  jsonSchema?: Types.DeepMutable<JsonSchema.JsonSchema>;
  features?: Partial<TableFeatures>;
  rowActions?: TableRowAction[];
  /** Actions applied to the current multi-selection; renders a toolbar above the table when rows are selected. */
  bulkActions?: TableRowAction[];
  onRowClick?: (row: any) => void;
  onRowAction?: (actionId: string, datum: any) => void;
  onBulkAction?: (actionId: string, rows: any[]) => void;
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
  bulkActions,
  onRowClick,
  onRowAction,
  onBulkAction,
  ...props
}: DynamicTableProps<T>) => {
  const registry = useContext(RegistryContext);
  const [dynamicTable, setDynamicTable] = useState<{ object: TableType.Table; projection: ProjectionModel }>();

  // TODO(burdon): Remove variance from the props (should be normalized externally; possibly via hooks).
  const { type } = useMemo(
    () => getBaseSchema({ typename: name, properties, jsonSchema: jsonSchemaProp, type: typeProp }),
    [name, properties, jsonSchemaProp, typeProp],
  );

  useEffect(() => {
    setDynamicTable(makeDynamicTable({ registry, type, properties }));
  }, [registry, type, properties]);

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
        // Enable multi-selection automatically when bulk actions are provided.
        selection: { enabled: !!bulkActions, mode: 'multiple' },
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

  return (
    <div className={mx('dx-expander grid', bulkActions && 'grid-rows-[auto_minmax(0,1fr)]', classNames)}>
      {bulkActions && model && (
        <BulkActionsToolbar
          model={model}
          actions={bulkActions}
          onAction={(actionId, selectedRows) => onBulkAction?.(actionId, selectedRows)}
        />
      )}
      <div className='grid min-h-0 overflow-hidden'>
        <Table.Root ref={tableRef}>
          <Table.Content model={model} presentation={presentation} ignoreAttention onRowClick={onRowClick} />
        </Table.Root>
      </div>
    </div>
  );
};

/** Toolbar rendered above the table when rows are selected; applies bulk actions to the selection. */
const BulkActionsToolbar = ({
  model,
  actions,
  onAction,
}: {
  model: TableModel;
  actions: TableRowAction[];
  onAction: (actionId: string, rows: any[]) => void;
}) => {
  const { t } = useTranslation(translationKey);
  const selection = useAtomValue(model.selection.selectionAtom);
  if (selection.size === 0) {
    return null;
  }
  return (
    <div className='flex items-center gap-2 p-1 bg-toolbar-surface border-be border-separator'>
      <span className='text-sm text-description px-1'>{selection.size} selected</span>
      {actions.map((action) => (
        <Button key={action.id} onClick={() => onAction(action.id, model.selection.getSelectedRows())}>
          {toLocalizedString(action.label, t)}
        </Button>
      ))}
    </div>
  );
};
