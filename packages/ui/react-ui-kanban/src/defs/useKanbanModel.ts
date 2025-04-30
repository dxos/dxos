//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type BaseSchema } from '@dxos/echo-schema';
import { type ReactiveObject } from '@dxos/react-client/echo';
import { type ViewProjection } from '@dxos/schema';

import { type KanbanType } from './kanban';
import { type BaseKanbanItem, KanbanModel } from './kanban-model';

export type UseKanbanModelProps<T extends BaseKanbanItem = { id: string }> = {
  kanban?: KanbanType;
  schema?: BaseSchema;
  projection?: ViewProjection;
  items?: ReactiveObject<T>[];
};

export const useKanbanModel = <T extends BaseKanbanItem = { id: string }>({
  kanban,
  schema,
  projection,
  items,
  ...props
}: UseKanbanModelProps<T>): KanbanModel<T> | undefined => {
  const [model, setModel] = useState<KanbanModel<T>>();
  useEffect(() => {
    if (!kanban || !schema || !projection) {
      return;
    }

    let model: KanbanModel<T> | undefined;
    const t = setTimeout(async () => {
      model = new KanbanModel<T>({ kanban, schema, projection, ...props });
      await model.open();
      setModel(model);
    });

    return () => {
      clearTimeout(t);
      void model?.close();
    };
  }, [kanban, schema, projection]);

  // Update data.
  useEffect(() => {
    if (model && items) {
      model.items = items;
    }
  }, [model, items]);

  return model;
};
