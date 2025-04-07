//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type EchoSchema } from '@dxos/echo-schema';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { Filter, useQuery, getSpace, create } from '@dxos/react-client/echo';
import { type KanbanType, useKanbanModel, Kanban } from '@dxos/react-ui-kanban';
import { StackItem } from '@dxos/react-ui-stack';
import { ViewProjection } from '@dxos/schema';

import { KanbanAction } from '../types';

export const KanbanContainer = ({ kanban }: { kanban: KanbanType; role: string }) => {
  const [cardSchema, setCardSchema] = useState<EchoSchema>();
  const [projection, setProjection] = useState<ViewProjection>();
  const space = getSpace(kanban);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  useEffect(() => {
    if (kanban.cardView?.target?.query?.typename && space) {
      const query = space.db.schemaRegistry.query({ typename: kanban.cardView.target.query.typename });
      const unsubscribe = query.subscribe(
        () => {
          const [schema] = query.results;
          if (schema) {
            setCardSchema(schema);
          }
        },
        { fire: true },
      );
      return unsubscribe;
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
    schema: cardSchema,
    projection,
    items: filteredObjects,
  });

  const handleAddCard = useCallback(
    (columnValue: string | undefined) => {
      const path = model?.columnFieldPath;
      if (space && cardSchema && path) {
        const card = create(cardSchema, { [path]: columnValue });
        space.db.add(card);
        return card.id;
      }
    },
    [space, cardSchema, model],
  );

  const handleRemoveCard = useCallback(
    (card: { id: string }) => {
      void dispatch(createIntent(KanbanAction.DeleteCard, { card }));
    },
    [dispatch],
  );

  return (
    <StackItem.Content toolbar={false}>
      {model && <Kanban model={model} onAddCard={handleAddCard} onRemoveCard={handleRemoveCard} />}
    </StackItem.Content>
  );
};
