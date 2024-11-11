//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type EchoReactiveObject } from '@dxos/react-client/echo';
import { type ViewProjection } from '@dxos/schema';

import { TableModel, type TableModelProps } from '../model';
import { type TableType } from '../types';

export type UseTableModelParams = {
  table?: TableType;
  projection?: ViewProjection;
  objects?: EchoReactiveObject<any>[];
} & Pick<TableModelProps, 'onDeleteColumn' | 'onDeleteRow'>;

export const useTableModel = ({
  table,
  projection,
  objects,
  onDeleteColumn,
  onDeleteRow,
}: UseTableModelParams): TableModel | undefined => {
  const [model, setModel] = useState<TableModel>();
  useEffect(() => {
    if (!table || !projection) {
      return;
    }

    let model: TableModel | undefined;
    const t = setTimeout(async () => {
      model = new TableModel({ table, projection, onDeleteColumn, onDeleteRow });
      await model.open();
      setModel(model);
    });

    return () => {
      clearTimeout(t);
      void model?.close();
    };
  }, [table, projection, onDeleteColumn, onDeleteRow]);

  // Update data.
  useEffect(() => {
    if (objects) {
      model?.updateData(objects);
    }
  }, [model, objects]);

  return model;
};
