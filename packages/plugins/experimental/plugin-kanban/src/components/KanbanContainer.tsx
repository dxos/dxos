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

export const KanbanContainer = ({ kanban }: { kanban: KanbanType; role: string }) => {
  const [cardSchema, setCardSchema] = useState<EchoSchema>();
  const space = getSpace(kanban);
  useEffect(() => {
    if (kanban.cardView?.target?.query?.type && space) {
      const [schema] = space.db.schemaRegistry.query({ typename: kanban.cardView.target.query.type }).runSync();
      if (schema) {
        setCardSchema(schema);
      }
    }
  }, [kanban.cardView?.target?.query, space]);

  const objects = useQuery(space, cardSchema ? Filter.schema(cardSchema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  const model = useKanbanModel({
    kanban,
    cardSchema,
    items: filteredObjects,
  });

  const handleAddColumn = useCallback((columnValue: string) => model?.addEmptyColumn(columnValue), [model]);

  const handleAddCard = useCallback(
    (columnValue: string) => {
      if (space && cardSchema) {
        space.db.add(
          create(cardSchema, {
            title: '',
            description: '',
            state: columnValue,
          }),
        );
      }
    },
    [space, cardSchema],
  );

  const handleRemoveCard = useCallback(
    (card: { id: string }) => {
      invariant(space);
      space.db.remove(card);
    },
    [space],
  );

  const handleRemoveEmptyColumn = useCallback(
    (columnValue: string) => {
      model?.removeColumnFromArrangement(columnValue);
    },
    [model],
  );

  return (
    <StackItem.Content toolbar={false}>
      {model ? (
        <Kanban
          model={model}
          onAddCard={handleAddCard}
          onAddColumn={handleAddColumn}
          onRemoveCard={handleRemoveCard}
          onRemoveEmptyColumn={handleRemoveEmptyColumn}
        />
      ) : (
        <span>Loading</span>
      )}
    </StackItem.Content>
  );
};
