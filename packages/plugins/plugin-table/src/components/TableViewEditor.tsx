//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { assertEchoSchema, isMutable } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';
import { Filter, getSpace, useQuery, useSchema } from '@dxos/react-client/echo';
import { ViewEditor } from '@dxos/react-ui-form';
import { type TableType } from '@dxos/react-ui-table';
import { ViewType } from '@dxos/schema';

import { TableAction } from '../types';

type TableViewEditorProps = { table: TableType };

const TableViewEditor = ({ table }: TableViewEditorProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();
  const space = getSpace(table);
  const schema = useSchema(client, space, table.view?.target?.query.typename);

  const views = useQuery(space, Filter.type(ViewType));
  const currentTypename = useMemo(() => table?.view?.target?.query?.typename, [table?.view?.target?.query?.typename]);

  const handleUpdateTypename = useCallback(
    (newTypename: string) => {
      invariant(schema);
      const matchingViews = views.filter((view) => view.query.typename === currentTypename);
      for (const view of matchingViews) {
        view.query.typename = newTypename;
      }

      assertEchoSchema(schema).updateTypename(newTypename);
    },
    [views, schema],
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
      view={table.view.target!}
      onTypenameChanged={isMutable(schema) ? undefined : handleUpdateTypename}
      onDelete={isMutable(schema) ? undefined : handleDelete}
    />
  );
};

export default TableViewEditor;
