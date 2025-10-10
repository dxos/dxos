//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Filter, Query, Type } from '@dxos/echo';
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
    (typename: string) => {
      invariant(schema);
      invariant(Type.isMutable(schema));

      const newQuery = Query.select(Filter.typename(typename));
      view.query.ast = newQuery.ast;
      schema.updateTypename(typename);
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
