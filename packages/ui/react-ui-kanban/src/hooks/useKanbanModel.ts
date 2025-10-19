//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';
import { useEffect, useState } from 'react';

import { type Live } from '@dxos/react-client/echo';
import { type DataType, type ProjectionModel } from '@dxos/schema';

import { type BaseKanbanItem, KanbanModel } from '../model';

export type UseKanbanModelProps<T extends BaseKanbanItem = { id: string }> = {
  view?: DataType.View;
  schema?: Schema.Schema.AnyNoContext;
  projection?: ProjectionModel;
  items?: Live<T>[];
};

export const useKanbanModel = <T extends BaseKanbanItem = { id: string }>({
  view,
  schema,
  projection,
  items,
  ...props
}: UseKanbanModelProps<T>): KanbanModel<T> | undefined => {
  const [model, setModel] = useState<KanbanModel<T>>();
  useEffect(() => {
    if (!view || !schema || !projection) {
      return;
    }

    let model: KanbanModel<T> | undefined;
    const t = setTimeout(async () => {
      model = new KanbanModel<T>({ view, schema, projection, ...props });
      await model.open();
      setModel(model);
    });

    return () => {
      clearTimeout(t);
      void model?.close();
    };
  }, [view, schema, projection]);

  // Update data.
  useEffect(() => {
    if (model && items) {
      model.items = items;
    }
  }, [model, items]);

  return model;
};
