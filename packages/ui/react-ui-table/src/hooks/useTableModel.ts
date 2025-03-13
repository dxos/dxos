//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { useEffect, useState } from 'react';

import { type ReactiveObject } from '@dxos/react-client/echo';
import { useSelectionActions } from '@dxos/react-ui-attention';
import { type ViewProjection } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { type BaseTableRow, TableModel, type TableModelProps } from '../model';
import { type TableType } from '../types';

export type UseTableModelParams<T extends BaseTableRow = { id: string }> = {
  table?: TableType;
  projection?: ViewProjection;
  objects?: ReactiveObject<T>[];
} & Pick<TableModelProps<T>, 'onInsertRow' | 'onDeleteRows' | 'onDeleteColumn' | 'onCellUpdate' | 'onRowOrderChanged'>;

export const useTableModel = <T extends BaseTableRow = { id: string }>({
  objects,
  table,
  projection,
  ...props
}: UseTableModelParams<T>): TableModel<T> | undefined => {
  const [model, setModel] = useState<TableModel<T>>();
  useEffect(() => {
    if (!table || !projection) {
      return;
    }

    let model: TableModel<T> | undefined;
    const t = setTimeout(async () => {
      model = new TableModel<T>({ table, projection, ...props });
      await model.open();
      setModel(model);
    });

    return () => {
      clearTimeout(t);
      void model?.close();
    };
  }, [table, projection]); // TODO(burdon): Trigger if callbacks change?

  // Update data.
  useEffect(() => {
    if (objects) {
      model?.setRows(objects);
    }
  }, [model, objects]);

  const { select, clear } = useSelectionActions([table?.id, table?.view?.target?.query.typename].filter(isNonNullable));

  useEffect(() => {
    if (!model) {
      return;
    }

    const unsubscribe = effect(() => {
      select([...model.selection.selection.value]);
    });

    // Maybe clear the selection here?
    return () => {
      clear();
      unsubscribe();
    };
  }, [model]);

  return model;
};
