//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type MutableSchema } from '@dxos/echo-schema';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { Filter, useQuery, getSpace } from '@dxos/react-client/echo';
import { type KanbanType, useKanbanModel, Kanban } from '@dxos/react-ui-kanban';

const stateColumns = { init: { label: 'To do' }, doing: { label: 'Doing' }, done: { label: 'Done' } };

export const KanbanMain = ({ kanban }: { kanban: KanbanType }) => {
  const [cardSchema, setCardSchema] = useState<MutableSchema>();
  const space = getSpace(kanban);
  useEffect(() => {
    if (kanban.cardView && space) {
      setCardSchema(space.db.schemaRegistry.getSchema(kanban.cardView!.query.type));
    }
  }, [kanban.cardView, space]);

  const objects = useQuery(space, cardSchema ? Filter.schema(cardSchema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  const model = useKanbanModel({
    kanban,
    cardSchema,
    items: filteredObjects,
  });

  if (!model) {
    return null;
  }

  return <Kanban model={model} columns={stateColumns} />;
};
