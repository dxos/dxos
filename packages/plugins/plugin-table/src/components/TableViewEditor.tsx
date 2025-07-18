//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';
import { Filter, getSpace, useQuery, useSchema } from '@dxos/react-client/echo';
import { ViewEditor } from '@dxos/react-ui-form';
import { DataType } from '@dxos/schema';

import { TableAction } from '../types';

type TableViewEditorProps = { view: DataType.HasView };

const TableViewEditor = ({ view }: TableViewEditorProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();
  const space = getSpace(view);
  const schema = useSchema(client, space, view.projection.target?.query.typename);

  const projections = useQuery(space, Filter.type(DataType.Projection));
  const currentTypename = useMemo(
    () => view.projection.target?.query?.typename,
    [view.projection.target?.query?.typename],
  );

  const handleUpdateTypename = useCallback(
    (typename: string) => {
      invariant(schema);
      invariant(Type.isMutable(schema));

      const matchingProjections = projections.filter((projection) => projection.query.typename === currentTypename);
      for (const projection of matchingProjections) {
        projection.query.typename = typename;
      }

      schema.updateTypename(typename);
    },
    [projections, schema],
  );

  const handleDelete = useCallback(
    (fieldId: string) => {
      void dispatch(createIntent(TableAction.DeleteColumn, { view, fieldId }));
    },
    [dispatch, view],
  );

  if (!space || !schema || !view.projection.target) {
    return null;
  }

  return (
    <ViewEditor
      registry={space.db.schemaRegistry}
      schema={schema}
      projection={view.projection.target}
      onTypenameChanged={Type.isMutable(schema) ? undefined : handleUpdateTypename}
      onDelete={Type.isMutable(schema) ? handleDelete : undefined}
    />
  );
};

export default TableViewEditor;
