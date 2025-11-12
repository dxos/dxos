//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type Live } from '@dxos/react-client/echo';
import { type ProjectionModel } from '@dxos/schema';

import { type BaseKanbanItem, KanbanModel } from '../model';
import { type Kanban } from '../types';

export type UseKanbanModelProps<T extends BaseKanbanItem = { id: string }> = {
  kanban?: Kanban.Kanban;
  projection?: ProjectionModel;
  items?: Live<T>[];
};

export const useKanbanModel = <T extends BaseKanbanItem = { id: string }>({
  kanban,
  projection,
  items,
  ...props
}: UseKanbanModelProps<T>): KanbanModel<T> | undefined => {
  const [model, setModel] = useState<KanbanModel<T>>();
  useEffect(() => {
    if (!kanban || !projection) {
      return;
    }

    let model: KanbanModel<T> | undefined;
    const t = setTimeout(async () => {
      model = new KanbanModel<T>({ kanban, projection, ...props });
      await model.open();
      setModel(model);
    });

    return () => {
      clearTimeout(t);
      void model?.close();
    };
    // TODO(ZaymonFC): Is there a better way to get notified about deep changes in the json schema?
  }, [kanban, projection]);

  // Update data.
  useEffect(() => {
    if (model && items) {
      model.items = items;
    }
  }, [model, items]);

  return model;
};
