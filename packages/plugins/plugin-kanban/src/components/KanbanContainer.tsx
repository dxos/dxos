//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Filter, Obj, Relation, Type } from '@dxos/echo';
import { EchoSchema, type TypedObject } from '@dxos/echo-schema';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { useClient } from '@dxos/react-client';
import { useQuery, getSpace } from '@dxos/react-client/echo';
import { useKanbanModel, Kanban, type KanbanView } from '@dxos/react-ui-kanban';
import { StackItem } from '@dxos/react-ui-stack';
import { type DataType, ProjectionManager } from '@dxos/schema';

import { KanbanAction } from '../types';

export const KanbanContainer = ({ view }: { view: DataType.HasView; role: string }) => {
  const client = useClient();
  const [cardSchema, setCardSchema] = useState<TypedObject<any, any>>();
  const [projectionManager, setProjectionManager] = useState<ProjectionManager>();
  const space = getSpace(view);
  const projection = view.projection.target;
  // TODO(wittjosiah): Remove cast.
  const kanban = Relation.getTarget(view as any) as KanbanView;
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const jsonSchema = useMemo(() => {
    if (!cardSchema) {
      return undefined;
    }
    return cardSchema instanceof EchoSchema ? cardSchema.jsonSchema : Type.toJsonSchema(cardSchema);
  }, [cardSchema]);

  useEffect(() => {
    const typename = projection?.query?.typename;
    const staticSchema = client.graph.schemaRegistry.schemas.find((schema) => Type.getTypename(schema) === typename);
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
  }, [projection?.query, space]);

  useEffect(() => {
    if (projection && jsonSchema) {
      setProjectionManager(new ProjectionManager(jsonSchema, projection));
    }
    // TODO(ZaymonFC): Is there a better way to get notified about deep changes in the json schema?
  }, [projection, JSON.stringify(jsonSchema)]);

  const objects = useQuery(space, cardSchema ? Filter.type(cardSchema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  const model = useKanbanModel({
    kanban,
    schema: cardSchema,
    projection: projectionManager,
    items: filteredObjects,
  });

  const handleAddCard = useCallback(
    (columnValue: string | undefined) => {
      const path = model?.columnFieldPath;
      if (space && cardSchema && path) {
        const card = Obj.make(cardSchema, { [path]: columnValue });
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
