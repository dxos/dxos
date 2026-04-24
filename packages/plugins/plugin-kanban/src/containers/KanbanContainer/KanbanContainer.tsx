//
// Copyright 2024 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import React, { useCallback, useContext, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { useObject, useSchema } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { getTagFromQuery, getTypenameFromQuery } from '@dxos/schema';

import { KanbanBoard } from '#components';
import { useEchoChangeCallback, useProjectionModel } from '#hooks';
import { KanbanOperation } from '#operations';
import { type Kanban } from '#types';

export type KanbanContainerProps = AppSurface.ObjectArticleProps<Kanban.Kanban>;

export const KanbanContainer = ({ role, subject: object }: KanbanContainerProps) => {
  const registry = useContext(RegistryContext);
  const schemas = useCapabilities(AppCapabilities.Schema);
  const db = Obj.getDatabase(object);
  const { invokePromise } = useOperationInvoker();
  const [view] = useObject(object.view);
  const typename = view?.query ? getTypenameFromQuery(view.query.ast) : undefined;
  const tag = view?.query ? getTagFromQuery(view.query.ast) : undefined;

  const schemaFromDb = useSchema(db, typename);
  const cardSchema = useMemo(
    () => schemaFromDb ?? schemas.flat().find((schema) => Type.getTypename(schema) === typename),
    [schemaFromDb, schemas, typename],
  );

  const items = useMemo(() => {
    if (!db) {
      return null;
    }
    const baseFilter = cardSchema ? Filter.type(cardSchema) : Filter.nothing();
    const query = tag ? Query.select(baseFilter).select(Filter.tag(tag)) : Query.select(baseFilter);
    return AtomQuery.make(db, query);
  }, [db, cardSchema, tag]);

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
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <KanbanBoard.Root
        kanban={object}
        projection={projection}
        items={items}
        change={change}
        onCardAdd={handleCardAdd}
        onCardRemove={handleCardRemove}
      >
        <Panel.Content asChild>
          <KanbanBoard.Content />
        </Panel.Content>
      </KanbanBoard.Root>
    </Panel.Root>
  );
};
