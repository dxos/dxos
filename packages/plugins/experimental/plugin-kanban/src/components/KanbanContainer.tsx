//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { type EchoSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { Filter, useQuery, getSpace, create } from '@dxos/react-client/echo';
import { type KanbanType, useKanbanModel, Kanban } from '@dxos/react-ui-kanban';
import { StackItem } from '@dxos/react-ui-stack';
import { ViewProjection } from '@dxos/schema';

export const KanbanContainer = ({ kanban }: { kanban: KanbanType; role: string }) => {
  const [cardSchema, setCardSchema] = useState<EchoSchema>();
  const [projection, setProjection] = useState<ViewProjection>();
  const space = getSpace(kanban);

  useEffect(() => {
    if (kanban.cardView?.target?.query?.type && space) {
      // TODO(ZaymonFC): We should use a subscription here.
      const [schema] = space.db.schemaRegistry.query({ typename: kanban.cardView.target.query.type }).runSync();
      if (schema) {
        setCardSchema(schema);
      }
    }
  }, [kanban.cardView?.target?.query, space]);

  useEffect(() => {
    if (kanban.cardView?.target && cardSchema) {
      setProjection(new ViewProjection(cardSchema, kanban.cardView.target));
    }
    // TODO(ZaymonFC): Is there a better way to get notified about deep changes in the json schema?
  }, [kanban.cardView?.target, cardSchema, JSON.stringify(cardSchema?.jsonSchema)]);

  const objects = useQuery(space, cardSchema ? Filter.schema(cardSchema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  const model = useKanbanModel({
    kanban,
    cardSchema,
    projection,
    items: filteredObjects,
  });

  const handleAddCard = useCallback(
    (columnValue: string | undefined) => {
      const path = model?.columnFieldPath;
      if (space && cardSchema && path) {
        space.db.add(create(cardSchema, { [path]: columnValue }));
      }
    },
    [space, cardSchema, model],
  );

  const handleRemoveCard = useCallback(
    (card: { id: string }) => {
      invariant(space);
      space.db.remove(card);
    },
    [space],
  );

  return (
    <StackItem.Content toolbar={false}>
      {model ? (
        <Kanban model={model} onAddCard={handleAddCard} onRemoveCard={handleRemoveCard} />
      ) : (
        <span>Loading</span>
      )}
    </StackItem.Content>
  );
};
