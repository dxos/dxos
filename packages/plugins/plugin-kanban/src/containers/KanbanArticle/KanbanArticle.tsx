//
// Copyright 2024 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useContext, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import { useObject, useType } from '@dxos/echo-react';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { getTagFromQuery, getTypeURIFromQuery } from '@dxos/schema';

import { KanbanBoard } from '#components';
import { useEchoChangeCallback, useItemsProjection, useProjectionModel } from '#hooks';
import { Kanban, KanbanOperation } from '#types';

export type KanbanArticleProps = AppSurface.ObjectArticleProps<Kanban.Kanban>;

export const KanbanArticle = (props: KanbanArticleProps) => {
  // Branch on `kanban.spec.kind`: view-variant runs a typename query through
  // `useProjectionModel`; items-variant dereferences `kanban.spec.items` and
  // uses a stub projection from `useItemsProjection`.
  return Kanban.isKanbanItems(props.subject) ? (
    <ItemsKanbanArticle {...props} subject={props.subject} />
  ) : (
    <ViewKanbanArticle {...props} />
  );
};

const ViewKanbanArticle = ({ role, subject: object }: KanbanArticleProps) => {
  const registry = useContext(RegistryContext);
  const schemas = Hooks.useCapabilities(AppCapabilities.Schema);
  const db = Obj.getDatabase(object);
  const { invokePromise } = Hooks.useOperationInvoker();
  const [view] = useObject(object.spec.kind === 'view' ? object.spec.view : undefined);
  const typeUri = view?.query ? getTypeURIFromQuery(view.query.ast) : undefined;
  const tag = view?.query ? getTagFromQuery(view.query.ast) : undefined;

  const schemaFromDb = useType(db, typeUri);
  const cardSchema = useMemo(
    () => schemaFromDb ?? schemas.flat().find((schema) => Type.getURI(schema) === typeUri),
    [schemaFromDb, schemas, typeUri],
  );

  const baseFilter = ToolkitHooks.useSchemaFilter(cardSchema);
  const items = useMemo(() => {
    if (!db) {
      return null;
    }
    const query = tag ? Query.select(baseFilter).select(Filter.tag(tag)) : Query.select(baseFilter);
    return db.query(query).atom;
  }, [db, baseFilter, tag]);

  const projection = useProjectionModel(cardSchema, object, registry);
  const change = useEchoChangeCallback(object);

  const pivotFieldId = view?.projection?.pivotFieldId;
  const columnFieldPath =
    projection && pivotFieldId ? projection.tryGetFieldProjection(pivotFieldId)?.props.property : undefined;

  const handleCardAdd = useCallback(
    (columnValue: string | undefined) => {
      if (db && cardSchema && columnFieldPath) {
        const card = Obj.make(Type.assertObject(cardSchema), {
          [columnFieldPath]: columnValue,
        });
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
      <Panel.Header>
        <Toolbar.Root />
      </Panel.Header>
      <KanbanBoard.Root
        kanban={object}
        projection={projection}
        items={items}
        change={change}
        onCardAdd={handleCardAdd}
        onCardRemove={handleCardRemove}
      >
        <Panel.Body asChild>
          <KanbanBoard.Content />
        </Panel.Body>
      </KanbanBoard.Root>
    </Panel.Root>
  );
};

type ItemsKanbanArticleProps = Omit<KanbanArticleProps, 'subject'> & { subject: Kanban.KanbanItems };

const ItemsKanbanArticle = ({ role, subject: object }: ItemsKanbanArticleProps) => {
  const db = Obj.getDatabase(object);
  const projection = useItemsProjection(object);
  const change = useEchoChangeCallback(object);

  // TODO(wittjosiah): pass refs (not loaded objects) through to the kanban
  //   board and let `KanbanCard` subscribe to its own ref via `useObject`.
  //   Today this atom subscribes to *every* item — any one changing causes the
  //   container (and the model's per-column atoms) to recompute. With cards
  //   subscribing themselves, the container only needs the refs and the
  //   per-card render is independent. Requires:
  //     - `KanbanCard` to accept `Ref<Obj.Unknown>` as `data` and call
  //       `useObject(ref)` internally.
  //     - The model to handle a ref-bearing item shape (id from
  //       `ref.dxn.asEchoDXN()?.echoUri`) and use arrangement-only ordering
  //       for items-variant (no pivot-value fallback, since refs don't expose
  //       the pivot field without loading).
  //     - `Mosaic.isItem` to accept the ref wrapper alongside `Obj.isObject`.
  const itemsAtom = useMemo(
    () =>
      Atom.make((get) => {
        const out: Obj.Unknown[] = [];
        const { items } = get(Obj.atomProperty(object, 'spec'));
        for (const ref of items) {
          // The snapshot subscribes to the card (so a soft delete drops it); the board model takes the live object.
          const snapshot = get(Obj.atom(ref));
          const target = get(Obj.atomReactive(ref));
          // Drop soft-deleted cards (e.g. Trello-closed cards). The ref
          // stays in `spec.items` so arrangement is preserved, but the card
          // shouldn't render.
          if (snapshot == null || target == null || Obj.isDeleted(snapshot)) {
            continue;
          }
          out.push(target);
        }
        return out;
      }),
    [object],
  );

  const handleCardRemove = useCallback(() => undefined, []);

  if (!object || !db || !change) {
    return null;
  }

  // TODO(wittjosiah): wire `onCardAdd` to the create-object flow so
  //   users can add items directly from the kanban (currently the column's
  //   "+" button is hidden because `onCardAdd` is undefined).
  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <Toolbar.Root />
      </Panel.Header>
      <KanbanBoard.Root
        kanban={object}
        projection={projection}
        items={itemsAtom}
        change={change}
        onCardRemove={handleCardRemove}
      >
        <Panel.Body asChild>
          <KanbanBoard.Content />
        </Panel.Body>
      </KanbanBoard.Root>
    </Panel.Root>
  );
};

KanbanArticle.displayName = 'KanbanArticle';
