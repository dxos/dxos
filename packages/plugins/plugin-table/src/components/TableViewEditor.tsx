//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { ViewEditor } from '@dxos/react-ui-form';
import { type TableType } from '@dxos/react-ui-table';
import { ViewType } from '@dxos/schema';

import { TableAction } from '../types';

type TableViewEditorProps = { table: TableType };

const TableViewEditor = ({ table }: TableViewEditorProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const space = getSpace(table);

  // TODO(ZaymonFC): The schema registry needs an API where we can query with initial value and
  // endure typename changes. We shouldn't need to manage a subscription at this layer.
  const [schema, setSchema] = useState(
    space && table?.view?.target?.query?.type
      ? space.db.schemaRegistry.getSchema(table.view.target!.query.type)
      : undefined,
  );
  // TODO(dmaretskyi): New hook for schema query.
  useEffect(() => {
    if (space && table?.view?.target?.query?.type) {
      const unsubscribe = space.db.schemaRegistry
        .query({ typename: table.view.target.query.type })
        .subscribe((query) => {
          const schema = query.results[0];
          if (schema) {
            setSchema(schema);
          }
        });

      return unsubscribe;
    }
  }, [space, table?.view?.target?.query?.type]);

  const views = useQuery(space, Filter.schema(ViewType));
  const currentTypename = useMemo(() => table?.view?.target?.query?.type, [table?.view?.target?.query?.type]);
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
