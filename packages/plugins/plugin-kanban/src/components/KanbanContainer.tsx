//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { createIntent } from '@dxos/app-framework';
import { useCapabilities, useIntentDispatcher } from '@dxos/app-framework/react';
import { Filter, Obj, Type } from '@dxos/echo';
import { type TypedObject } from '@dxos/echo/internal';
import { ClientCapabilities } from '@dxos/plugin-client';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { Kanban as KanbanComponent, useKanbanModel, useProjectionModel } from '@dxos/react-ui-kanban';
import { type Kanban } from '@dxos/react-ui-kanban/types';
import { StackItem } from '@dxos/react-ui-stack';
import { getTypenameFromQuery } from '@dxos/schema';

import { KanbanAction } from '../types';

export const KanbanContainer = ({ object }: { object: Kanban.Kanban; role: string }) => {
  const schemas = useCapabilities(ClientCapabilities.Schema);
  const [cardSchema, setCardSchema] = useState<TypedObject<any, any>>();
  const space = getSpace(object);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const typename = object.view.target?.query ? getTypenameFromQuery(object.view.target.query.ast) : undefined;

  useEffect(() => {
    const staticSchema = schemas.flat().find((schema) => Type.getTypename(schema) === typename);
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
  }, [schemas, space, typename]);

  const objects = useQuery(space?.db, cardSchema ? Filter.type(cardSchema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  const projection = useProjectionModel(cardSchema, object);
  const model = useKanbanModel({
    object,
    projection,
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
      {model && <KanbanComponent model={model} onAddCard={handleAddCard} onRemoveCard={handleRemoveCard} />}
    </StackItem.Content>
  );
};
