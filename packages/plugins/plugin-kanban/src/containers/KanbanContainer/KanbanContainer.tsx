//
// Copyright 2024 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import React, { useCallback, useContext, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Type } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { useObject, useSchema } from '@dxos/react-client/echo';
import { Container } from '@dxos/react-ui';
import { getTypenameFromQuery } from '@dxos/schema';

import { KanbanBoard } from '../../components';
import { useEchoChangeCallback, useProjectionModel } from '../../hooks';
import { type Kanban, KanbanOperation } from '../../types';

export type KanbanContainerProps = SurfaceComponentProps<Kanban.Kanban>;

export const KanbanContainer = ({ role, subject: object }: KanbanContainerProps) => {
  const registry = useContext(RegistryContext);
  const schemas = useCapabilities(AppCapabilities.Schema);
  const db = Obj.getDatabase(object);
  const { invokePromise } = useOperationInvoker();
  const [view] = useObject(object.view);
  const typename = view?.query ? getTypenameFromQuery(view.query.ast) : undefined;

  const schemaFromDb = useSchema(db, typename);
  const cardSchema = useMemo(
    () => schemaFromDb ?? schemas.flat().find((schema) => Type.getTypename(schema) === typename),
    [schemaFromDb, schemas, typename],
  );

  const items = useMemo(
    () => (db ? AtomQuery.make(db, cardSchema ? Filter.type(cardSchema) : Filter.nothing()) : null),
    [db, cardSchema],
  );

  const projection = useProjectionModel(cardSchema, object, registry);
  const change = useEchoChangeCallback(object);

  const pivotFieldId = view?.projection?.pivotFieldId;
  const columnFieldPath =
    projection && pivotFieldId ? projection.tryGetFieldProjection(pivotFieldId)?.props.property : undefined;

  const handleCardAdd = useCallback(
    (columnValue: string | undefined) => {
      if (db && cardSchema && columnFieldPath) {
        const card = Obj.make(cardSchema, { [columnFieldPath]: columnValue });
        db.add(card);
        return card.id;
      }
    },
    [db, cardSchema, columnFieldPath],
  );

  const handleCardRemove = useCallback(
    (card: { id: string }) => {
      void invokePromise(KanbanOperation.DeleteCard, { card });
    },
    [invokePromise],
  );

  if (!object || !db || !items || !projection || !change) {
    return null;
  }

  return (
    <Container.Main role={role}>
      <KanbanBoard.Root
        kanban={object}
        projection={projection}
        items={items}
        change={change}
        onCardAdd={handleCardAdd}
        onCardRemove={handleCardRemove}
      >
        <KanbanBoard.Content />
      </KanbanBoard.Root>
    </Container.Main>
  );
};
