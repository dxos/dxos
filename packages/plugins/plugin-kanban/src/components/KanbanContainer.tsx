//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { EchoSchema, getTypenameOrThrow, toJsonSchema, type TypedObject } from '@dxos/echo-schema';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { useClient } from '@dxos/react-client';
import { Filter, useQuery, getSpace, live } from '@dxos/react-client/echo';
import { type KanbanType, useKanbanModel, Kanban } from '@dxos/react-ui-kanban';
import { StackItem } from '@dxos/react-ui-stack';
import { ViewProjection } from '@dxos/schema';

import { KanbanAction } from '../types';

export const KanbanContainer = ({ kanban }: { kanban: KanbanType; role: string }) => {
  const client = useClient();
  const [cardSchema, setCardSchema] = useState<TypedObject<any, any>>();
  const [projection, setProjection] = useState<ViewProjection>();
  const space = getSpace(kanban);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const jsonSchema = useMemo(
    () =>
      cardSchema instanceof EchoSchema ? cardSchema.jsonSchema : cardSchema ? toJsonSchema(cardSchema) : undefined,
    [cardSchema],
  );

  useEffect(() => {
    const typename = kanban.cardView?.target?.query?.typename;
    const staticSchema = client.graph.schemaRegistry.schemas.find((schema) => getTypenameOrThrow(schema) === typename);
    if (staticSchema) {
      setCardSchema(() => staticSchema as TypedObject<any, any>);
    }
    if (!staticSchema && typename && space) {
      const query = space.db.schemaRegistry.query({ typename });
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
    if (kanban.cardView?.target && jsonSchema) {
      setProjection(new ViewProjection(jsonSchema, kanban.cardView.target));
    }
    // TODO(ZaymonFC): Is there a better way to get notified about deep changes in the json schema?
  }, [kanban.cardView?.target, JSON.stringify(jsonSchema)]);

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
        const card = live(cardSchema, { [path]: columnValue });
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
    <StackItem.Content>
      {model && <Kanban model={model} onAddCard={handleAddCard} onRemoveCard={handleRemoveCard} />}
    </StackItem.Content>
  );
};
