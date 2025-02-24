//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { Filter, getSpace, useQuery, useSchema } from '@dxos/react-client/echo';
import { ViewEditor } from '@dxos/react-ui-form';
import { type TableType } from '@dxos/react-ui-table';
import { ViewType } from '@dxos/schema';

import { TableAction } from '../types';

type TableViewEditorProps = { table: TableType };

const TableViewEditor = ({ table }: TableViewEditorProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const space = getSpace(table);
  const schema = useSchema(space, table.view?.target?.query.type);

  const views = useQuery(space, Filter.schema(ViewType));
  const currentTypename = useMemo(() => table?.view?.target?.query?.type, [table?.view?.target?.query?.type]);
  const updateViewTypename = useCallback(
    (newTypename: string) => {
      invariant(schema);

      const matchingViews = views.filter((view) => view.query.type === currentTypename);
      for (const view of matchingViews) {
        view.query.type = newTypename;
      }
      schema.updateTypename(newTypename);
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
      onTypenameChanged={updateViewTypename}
      onDelete={handleDelete}
    />
  );
};

export default TableViewEditor;
