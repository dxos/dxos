//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { getSpace } from '@dxos/react-client/echo';
import { ViewEditor, Form } from '@dxos/react-ui-form';
import { type KanbanType, KanbanPropsSchema } from '@dxos/react-ui-kanban';

import { KanbanAction } from '../types';

type KanbanViewEditorProps = { kanban: KanbanType };

const KanbanViewEditor = ({ kanban }: KanbanViewEditorProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const space = getSpace(kanban);

  // TODO(ZaymonFC): The schema registry needs an API where we can query with initial value and
  // endure typename changes. We shouldn't need to manage a subscription at this layer.
  const [schema, setSchema] = useState(
    space && kanban?.cardView?.target?.query?.type
      ? space.db.schemaRegistry.getSchema(kanban.cardView.target.query.type)
      : undefined,
  );

  useEffect(() => {
    if (space && kanban?.cardView?.target?.query?.type) {
      const unsubscribe = space.db.schemaRegistry.subscribe((schemas) => {
        const schema = schemas.find((schema) => schema.typename === kanban?.cardView?.target?.query?.type);
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
        onDelete={handleDelete}
      />
    </>
  );
};

export default KanbanViewEditor;
