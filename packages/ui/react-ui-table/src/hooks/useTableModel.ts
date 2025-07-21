//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import orderBy from 'lodash.orderby';
import { useEffect, useState } from 'react';

import { type JsonSchemaType } from '@dxos/echo-schema';
import { type Live } from '@dxos/live-object';
import { useSelectionActions } from '@dxos/react-ui-attention';
import { type DataType, type ProjectionModel } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { type TableRow, TableModel, type TableModelProps, type TableRowAction } from '../model';

export type UseTableModelParams<T extends TableRow = TableRow> = {
  id?: string;
  view?: DataType.View;
  schema?: JsonSchemaType;
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
  id,
  view,
  schema,
  projection,
  rows,
  rowActions,
  features,
  onSelectionChanged,
  onRowAction,
  ...props
}: UseTableModelParams<T>): TableModel<T> | undefined => {
  const [model, setModel] = useState<TableModel<T>>();
  useEffect(() => {
    if (!id || !view || !schema) {
      return;
    }

    let model: TableModel<T> | undefined;
    const t = setTimeout(async () => {
      model = new TableModel<T>({
        id,
        view,
        schema,
        projection,
        features,
        rowActions,
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
  }, [id, view, schema, projection, features, rowActions]); // TODO(burdon): Trigger if callbacks change?

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

  const { multiSelect, clear } = useSelectionActions([id, view?.query.typename].filter(isNonNullable));

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
