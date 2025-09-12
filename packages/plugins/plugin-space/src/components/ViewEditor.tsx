//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';
import { Filter, getSpace, useQuery, useSchema } from '@dxos/react-client/echo';
import { ViewEditor as NaturalViewEditor } from '@dxos/react-ui-form';
import { DataType } from '@dxos/schema';

import { SpaceAction } from '../types';

type ViewEditorProps = { view: DataType.View };

export const ViewEditor = ({ view }: ViewEditorProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();
  const space = getSpace(view);
  const schema = useSchema(client, space, view.query.typename);

  const views = useQuery(space, Filter.type(DataType.View));
  const currentTypename = useMemo(() => view.query?.typename, [view.query?.typename]);

  const handleUpdateTypename = useCallback(
    (typename: string) => {
      invariant(schema);
      invariant(Type.isMutable(schema));

      const matchingViews = views.filter((view) => view.query.typename === currentTypename);
      for (const view of matchingViews) {
        view.query.typename = typename;
      }

      schema.updateTypename(typename);
    },
    [views, schema],
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
      onTypenameChanged={Type.isMutable(schema) ? handleUpdateTypename : undefined}
      onDelete={Type.isMutable(schema) ? handleDelete : undefined}
      outerSpacing={false}
    />
  );
};
