//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type JsonSchemaType } from '@dxos/echo/internal';
import { type Live } from '@dxos/react-client/echo';
import { ProjectionModel } from '@dxos/schema';

import { type BaseKanbanItem, KanbanModel } from '../model';
import { type Kanban } from '../types';

export type UseKanbanModelProps<T extends BaseKanbanItem = { id: string }> = {
  kanban?: Kanban.Kanban;
  jsonSchema?: JsonSchemaType;
  items?: Live<T>[];
};

export const useKanbanModel = <T extends BaseKanbanItem = { id: string }>({
  kanban,
  jsonSchema,
  items,
  ...props
}: UseKanbanModelProps<T>): KanbanModel<T> | undefined => {
  const [model, setModel] = useState<KanbanModel<T>>();
  const projection = kanban?.view.target?.projection;
  useEffect(() => {
    if (!kanban || !jsonSchema || !projection) {
      return;
    }

    let model: KanbanModel<T> | undefined;
    const t = setTimeout(async () => {
      const projectionModel = new ProjectionModel(jsonSchema, projection);
      model = new KanbanModel<T>({ kanban, projection: projectionModel, ...props });
      await model.open();
      setModel(model);
    });

    return () => {
      clearTimeout(t);
      void model?.close();
    };
    // TODO(ZaymonFC): Is there a better way to get notified about deep changes in the json schema?
  }, [kanban, projection, JSON.stringify(jsonSchema)]);

  // Update data.
  useEffect(() => {
    if (model && items) {
      model.items = items;
    }
  }, [model, items]);

  return model;
};
