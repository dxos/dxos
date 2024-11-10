//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type ReactiveObject } from '@dxos/react-client/echo';
import { type ViewProjection } from '@dxos/schema';

import { type BaseTableRow, TableModel, type TableModelProps } from '../model';
import { type TableType } from '../types';

export type UseTableModelParams<T extends BaseTableRow = {}> = {
  table?: TableType;
  projection?: ViewProjection;
  objects?: ReactiveObject<T>[];
} & Pick<TableModelProps<T>, 'onDeleteRow' | 'onDeleteColumn' | 'onCellUpdate' | 'onRowOrderChanged'>;

export const useTableModel = <T extends BaseTableRow = {}>({
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
  }, [table, projection, props]);

  // Update data.
  useEffect(() => {
    if (objects) {
      model?.setRows(objects);
    }
  }, [model, objects]);

  return model;
};
