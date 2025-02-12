//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Capabilities, createIntent, useCapability } from '@dxos/app-framework';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { ViewEditor, Form } from '@dxos/react-ui-form';
import { type KanbanType, KanbanPropsSchema } from '@dxos/react-ui-kanban';
import { ViewType } from '@dxos/schema';

import { KanbanAction } from '../types';

type KanbanViewEditorProps = { kanban: KanbanType };

export const KanbanViewEditor = ({ kanban }: KanbanViewEditorProps) => {
  const { dispatchPromise: dispatch } = useCapability(Capabilities.IntentDispatcher);
  const space = getSpace(kanban);

  // TODO(ZaymonFC): The schema registry needs an API where we can query with initial value and
  // endure typename changes. We shouldn't need to manage a subscription at this layer.
  const [schema, setSchema] = useState(
    space && kanban?.cardView?.target?.query?.type
      ? space.db.schemaRegistry.getSchema(kanban.cardView.target.query.type)
      : undefined,
  );

  const views = useQuery(space, Filter.schema(ViewType));
  const currentTypename = useMemo(() => kanban?.cardView?.target?.query?.type, [kanban?.cardView?.target?.query?.type]);
  const updateViewTypename = useCallback(
    (newTypename: string) => {
      if (!schema) {
        return;
      }
      const matchingViews = views.filter((view) => view.query.type === currentTypename);
      for (const view of matchingViews) {
        view.query.type = newTypename;
      }
      schema.updateTypename(newTypename);
    },
    [views, schema],
  );

  useEffect(() => {
    if (space && kanban?.cardView?.target?.query?.type) {
      const unsubscribe = space.db.schemaRegistry
        .query({ typename: kanban?.cardView?.target?.query?.type })
        .subscribe((query) => {
          const [schema] = query.results;
          if (schema) {
            setSchema(schema);
          }
        });

      return unsubscribe;
    }
  }, [space, kanban?.cardView?.target?.query?.type]);

  const handleDelete = useCallback(
    (fieldId: string) => dispatch?.(createIntent(KanbanAction.DeleteCardField, { kanban, fieldId })),
    [dispatch, kanban],
  );

  if (!space || !schema || !kanban.cardView?.target) {
    return null;
  }

  return (
    <>
      <Form
        schema={KanbanPropsSchema}
        values={{ columnField: kanban.columnField }}
        onSave={({ columnField }) => {
          kanban.columnField = columnField;
          kanban.arrangement = undefined;
        }}
      />
      <ViewEditor
        registry={space.db.schemaRegistry}
        schema={schema}
        view={kanban.cardView.target}
        onTypenameChanged={updateViewTypename}
        onDelete={handleDelete}
      />
    </>
  );
};
