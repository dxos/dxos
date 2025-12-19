//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { useEffect, useMemo, useRef, useState } from 'react';

import { type Database, Obj } from '@dxos/echo';
import { type Live } from '@dxos/live-object';
import { useSelected, useSelectionActions } from '@dxos/react-ui-attention';
import { type ProjectionModel } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { TableModel, type TableModelProps, type TableRow, type TableRowAction } from '../model';
import { type Table } from '../types';

export type UseTableModelParams<T extends TableRow = TableRow> = {
  object?: Table.Table;
  projection?: ProjectionModel;
  db?: Database.Database;
  rows?: Live<T>[];
  rowActions?: TableRowAction[];
  onSelectionChanged?: (selection: string[]) => void;
  onRowAction?: (actionId: string, data: T) => void;
} & Pick<
  TableModelProps<T>,
  'features' | 'onInsertRow' | 'onDeleteRows' | 'onDeleteColumn' | 'onCellUpdate' | 'onRowOrderChange'
>;

export const useTableModel = <T extends TableRow = TableRow>({
  object,
  projection,
  db,
  rows,
  rowActions,
  features,
  onSelectionChanged,
  onRowAction,
  ...props
}: UseTableModelParams<T>): TableModel<T> | undefined => {
  const selected = useSelected(object && Obj.getDXN(object).toString(), 'multi');
  const initialSelection = useMemo(() => selected, [object]);

  const [model, setModel] = useState<TableModel<T>>();
  useEffect(() => {
    if (!object || !projection) {
      return;
    }

    let model: TableModel<T> | undefined;
    const t = setTimeout(async () => {
      model = new TableModel<T>({
        object,
        projection,
        db,
        features,
        rowActions,
        initialSelection,
        onRowAction,
        ...props,
      });
      await model.open();
      setModel(model);
    });

    return () => {
      clearTimeout(t);
      void model?.close();
    };
    // TODO(burdon): Trigger if callbacks change?
  }, [object, projection, features, rowActions, initialSelection]);

  // Update data when rows change.
  useEffect(() => {
    if (rows && model) {
      model.setRows(rows);
    }
  }, [model, rows]);

  const { multiSelect, clear } = useSelectionActions([model?.id].filter(isNonNullable));

  useEffect(() => {
    if (!model) {
      return;
    }

    const unsubscribe = effect(() => {
      const selectedItems = [...model.selection.selection.value];
      multiSelect(selectedItems);
      onSelectionChanged?.(selectedItems);
    });

    // Maybe clear the selection here?
    return () => {
      clear();
      unsubscribe();
    };
  }, [model, onSelectionChanged]);

  return model;
};
