//
// Copyright 2024 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import React, { useCallback, useContext, useEffect, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Type } from '@dxos/echo';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { useQuery } from '@dxos/react-client/echo';
import { Layout } from '@dxos/react-ui';
import { Kanban as KanbanComponent, useKanbanModel, useProjectionModel } from '@dxos/react-ui-kanban';
import { type Kanban } from '@dxos/react-ui-kanban/types';
import { getTypenameFromQuery } from '@dxos/schema';

import { KanbanOperation } from '../types';

export type KanbanContainerProps = SurfaceComponentProps<Kanban.Kanban>;

export const KanbanContainer = ({ role, subject: object }: KanbanContainerProps) => {
  const registry = useContext(RegistryContext);
  const schemas = useCapabilities(AppCapabilities.Schema);
  const [cardSchema, setCardSchema] = useState<Type.Obj.Any>();
  const db = Obj.getDatabase(object);
  const { invokePromise } = useOperationInvoker();
  const typename = object.view.target?.query ? getTypenameFromQuery(object.view.target.query.ast) : undefined;

  useEffect(() => {
    const staticSchema = schemas.flat().find((schema) => Type.getTypename(schema) === typename);
    if (staticSchema) {
      // NOTE: Use functional update to prevent React from calling the schema as a function.
      setCardSchema(() => staticSchema);
    }
    if (!staticSchema && typename && db) {
      const query = db.schemaRegistry.query({ typename });
      const unsubscribe = query.subscribe(
        () => {
          const [schema] = query.results;
          if (schema) {
            // NOTE: Use functional update to prevent React from calling the schema as a function.
            setCardSchema(() => schema);
          }
        },
        { fire: true },
      );
      return unsubscribe;
    }
  }, [schemas, db, typename]);

  const objects = useQuery(db, cardSchema ? Filter.type(cardSchema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  const projection = useProjectionModel(cardSchema, object, registry);
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
    <Layout.Main role={role}>
      {model && <KanbanComponent model={model} onAddCard={handleAddCard} onRemoveCard={handleRemoveCard} />}
    </Layout.Main>
  );
};
