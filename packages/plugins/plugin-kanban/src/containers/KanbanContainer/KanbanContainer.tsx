//
// Copyright 2024 DXOS.org
//

import { Atom, RegistryContext } from '@effect-atom/atom-react';
import React, { useCallback, useContext, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, type Ref, Type } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { useObject, useSchema } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { getTagFromQuery, getTypenameFromQuery } from '@dxos/schema';

import { KanbanBoard } from '#components';
import { useEchoChangeCallback, useItemsProjection, useProjectionModel } from '#hooks';
import { KanbanOperation } from '#operations';
import { Kanban } from '#types';

export type KanbanContainerProps = AppSurface.ObjectArticleProps<Kanban.Kanban>;

export const KanbanContainer = (props: KanbanContainerProps) => {
  // Branch on `kanban.spec.kind`: view-variant runs a typename query through
  // `useProjectionModel`; items-variant dereferences `kanban.spec.items` and
  // uses a stub projection from `useItemsProjection`.
  return Kanban.isKanbanItems(props.subject) ? (
    <ItemsKanbanContainer {...props} subject={props.subject} />
  ) : (
    <ViewKanbanContainer {...props} />
  );
};

const ViewKanbanContainer = ({ role, subject: object }: KanbanContainerProps) => {
  const registry = useContext(RegistryContext);
  const schemas = useCapabilities(AppCapabilities.Schema);
  const db = Obj.getDatabase(object);
  const { invokePromise } = useOperationInvoker();
  const [view] = useObject(object.spec.kind === 'view' ? object.spec.view : undefined);
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

type ItemsKanbanContainerProps = Omit<KanbanContainerProps, 'subject'> & { subject: Kanban.KanbanItems };

const ItemsKanbanContainer = ({ role, subject: object }: ItemsKanbanContainerProps) => {
  const db = Obj.getDatabase(object);
  const projection = useItemsProjection(object);
  const change = useEchoChangeCallback(object);

  // Items atom: dereference each ref's `target` snapshot, filtering out
  // closed/tombstoned cards (the pull pass marks `closed=true` for cards
  // deleted upstream — they shouldn't render). Re-derived when the kanban's
  // items array changes.
  const itemsAtom = useMemo(
    () =>
      Atom.make(() =>
        (object.spec.items as ReadonlyArray<Ref.Ref<Obj.Unknown>>)
          .map((ref) => ref.target)
          .filter(
            (target): target is Obj.Unknown =>
              target != null && (target as unknown as { closed?: unknown }).closed !== true,
          ),
      ),
    [object.spec.items],
  );

  // Items variant doesn't support card-create through the Kanban UI yet — items
  // are owned by the integration. Card removal still goes through the standard op.
  const handleCardAdd = useCallback(() => undefined, []);
  const handleCardRemove = useCallback(() => undefined, []);

  if (!object || !db || !change) {
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
        items={itemsAtom}
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
