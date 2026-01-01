//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { Common } from '@dxos/app-framework';
import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/react';
import { Filter, Obj, Type } from '@dxos/echo';
import { type TypedObject } from '@dxos/echo/internal';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { useQuery } from '@dxos/react-client/echo';
import { Kanban as KanbanComponent, useKanbanModel, useProjectionModel } from '@dxos/react-ui-kanban';
import { type Kanban } from '@dxos/react-ui-kanban/types';
import { StackItem } from '@dxos/react-ui-stack';
import { getTypenameFromQuery } from '@dxos/schema';

import { KanbanAction, KanbanOperation } from '../types';

export const KanbanContainer = ({ object }: { object: Kanban.Kanban; role: string }) => {
  const schemas = useCapabilities(Common.Capability.Schema);
  const [cardSchema, setCardSchema] = useState<TypedObject<any, any>>();
  const db = Obj.getDatabase(object);
  const { invokePromise } = useOperationInvoker();
  const typename = object.view.target?.query ? getTypenameFromQuery(object.view.target.query.ast) : undefined;

  useEffect(() => {
    const staticSchema = schemas.flat().find((schema) => Type.getTypename(schema) === typename);
    if (staticSchema) {
      setCardSchema(() => staticSchema as TypedObject<any, any>);
    }
    if (!staticSchema && typename && db) {
      const query = db.schemaRegistry.query({ typename });
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
  }, [schemas, db, typename]);

  const objects = useQuery(db, cardSchema ? Filter.type(cardSchema) : Filter.nothing());
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
      if (db && cardSchema && path) {
        const card = Obj.make(cardSchema, { [path]: columnValue });
        db.add(card);
        return card.id;
      }
    },
    [db, cardSchema, model],
  );

  const handleRemoveCard = useCallback(
    (card: { id: string }) => {
      void invokePromise(KanbanOperation.DeleteCard, { card });
    },
    [invokePromise],
  );

  return (
    <StackItem.Content>
      {model && <KanbanComponent model={model} onAddCard={handleAddCard} onRemoveCard={handleRemoveCard} />}
    </StackItem.Content>
  );
};
