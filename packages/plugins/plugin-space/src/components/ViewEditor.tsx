//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type QueryAST, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';
import { getSpace, useSchema } from '@dxos/react-client/echo';
import { ViewEditor as NaturalViewEditor } from '@dxos/react-ui-form';
import { type DataType, getTypenameFromQuery } from '@dxos/schema';

import { SpaceAction } from '../types';

type ViewEditorProps = { view: DataType.View };

export const ViewEditor = ({ view }: ViewEditorProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();
  const space = getSpace(view);
  const typename = view.query ? getTypenameFromQuery(view.query.ast) : undefined;
  const schema = useSchema(client, space, typename);

  const handleUpdateQuery = useCallback(
    (newQuery: QueryAST.Query) => {
      invariant(schema);
      invariant(Type.isMutable(schema));

      view.query.ast = newQuery;
      schema.updateTypename(getTypenameFromQuery(newQuery));
    },
    [view, schema],
  );

  const handleDelete = useCallback(
    (fieldId: string) => {
      void dispatch(createIntent(SpaceAction.DeleteField, { view, fieldId }));
    },
    [dispatch, view],
  );

  if (!space || !schema) {
    return null;
  }

  return (
    <NaturalViewEditor
      registry={space.db.schemaRegistry}
      schema={schema}
      view={view}
      onQueryChanged={Type.isMutable(schema) ? handleUpdateQuery : undefined}
      onDelete={Type.isMutable(schema) ? handleDelete : undefined}
      outerSpacing={false}
    />
  );
};
