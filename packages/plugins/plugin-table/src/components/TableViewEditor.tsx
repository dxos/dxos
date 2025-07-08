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
import { type TableType } from '@dxos/react-ui-table';
import { DataType } from '@dxos/schema';

import { TableAction } from '../types';

type TableViewEditorProps = { table: TableType };

const TableViewEditor = ({ table }: TableViewEditorProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();
  const space = getSpace(table);
  const schema = useSchema(client, space, table.view?.target?.query.typename);

  const projections = useQuery(space, Filter.type(DataType.Projection));
  const currentTypename = useMemo(() => table?.view?.target?.query?.typename, [table?.view?.target?.query?.typename]);

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
      void dispatch(createIntent(TableAction.DeleteColumn, { table, fieldId }));
    },
    [dispatch, table],
  );

  if (!space || !schema || !table.view) {
    return null;
  }

  return (
    <ViewEditor
      registry={space.db.schemaRegistry}
      schema={schema}
      projection={table.view.target!}
      onTypenameChanged={Type.isMutable(schema) ? undefined : handleUpdateTypename}
      onDelete={Type.isMutable(schema) ? handleDelete : undefined}
    />
  );
};

export default TableViewEditor;
