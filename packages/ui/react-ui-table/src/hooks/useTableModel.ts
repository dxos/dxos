//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import orderBy from 'lodash.orderby';
import { useEffect, useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import { type Live } from '@dxos/live-object';
import { useSelected, useSelectionActions } from '@dxos/react-ui-attention';
import { type ProjectionModel } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { TableModel, type TableModelProps, type TableRow, type TableRowAction } from '../model';
import { type Table } from '../types';

export type UseTableModelParams<T extends TableRow = TableRow> = {
  table?: Table.Table;
  projection?: ProjectionModel;
  rows?: Live<T>[];
  rowActions?: TableRowAction[];
  onSelectionChanged?: (selection: string[]) => void;
  onRowAction?: (actionId: string, data: T) => void;
} & Pick<
  TableModelProps<T>,
  'features' | 'onInsertRow' | 'onDeleteRows' | 'onDeleteColumn' | 'onCellUpdate' | 'onRowOrderChange'
>;

export const useTableModel = <T extends TableRow = TableRow>({
  table,
  projection,
  rows,
  rowActions,
  features,
  onSelectionChanged,
  onRowAction,
  ...props
}: UseTableModelParams<T>): TableModel<T> | undefined => {
  const selected = useSelected(table && Obj.getDXN(table).toString(), 'multi');
  const initialSelection = useMemo(() => selected, [table]);

  const [model, setModel] = useState<TableModel<T>>();
  useEffect(() => {
    if (!table || !projection) {
      return;
    }

    let model: TableModel<T> | undefined;
    const t = setTimeout(async () => {
      model = new TableModel<T>({
        table,
        projection,
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
  }, [table, projection, features, rowActions, initialSelection]);

  // Update data.
  useEffect(() => {
    if (rows) {
      // TODO(ZaymonFC): Remove this workaround once unstable query ordering issue is resolved
      /*
       * Sort all objects by string id field as a temporary workaround for query ordering issues
       * Reference: https://github.com/dxos/dxos/pull/9409
       */
      const sortedRows = orderBy(rows, [(row) => String(row.id)], ['asc']);
      model?.setRows(sortedRows);
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
