//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';
import { getSpace } from '@dxos/react-client/echo';
import { ViewEditor } from '@dxos/react-ui-form';
import { type KanbanType } from '@dxos/react-ui-kanban';

import { KANBAN_PLUGIN } from '../meta';
import { KanbanAction } from '../types';

type KanbanViewEditorProps = { kanban: KanbanType };

const KanbanViewEditor = ({ kanban }: KanbanViewEditorProps) => {
  const dispatch = useIntentDispatcher();
  const space = getSpace(kanban);

  // TODO(ZaymonFC): The schema registry needs an API where we can query with initial value and
  // endure typename changes. We shouldn't need to manage a subscription at this layer.
  const [schema, setSchema] = useState(
    space && kanban?.cardView?.query?.type ? space.db.schemaRegistry.getSchema(kanban.cardView.query.type) : undefined,
  );
  useEffect(() => {
    if (space && kanban?.cardView?.query?.type) {
      const unsubscribe = space.db.schemaRegistry.subscribe((schemas) => {
        const schema = schemas.find((schema) => schema.typename === kanban?.cardView?.query?.type);
        if (schema) {
          setSchema(schema);
        }
      });

      return unsubscribe;
    }
  }, [space, kanban?.cardView?.query?.type]);

  const handleDelete = useCallback(
    (fieldId: string) => {
      void dispatch?.({
        plugin: KANBAN_PLUGIN,
        action: KanbanAction.DELETE_CARD_FIELD,
        data: { kanban, fieldId },
      });
    },
    [dispatch, kanban],
  );

  if (!space || !schema || !kanban.cardView) {
    return null;
  }

  return (
    <ViewEditor registry={space.db.schemaRegistry} schema={schema} view={kanban.cardView} onDelete={handleDelete} />
  );
};

export default KanbanViewEditor;
