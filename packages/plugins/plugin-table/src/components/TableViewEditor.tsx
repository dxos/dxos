//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';
import { getSpace } from '@dxos/react-client/echo';
import { ViewEditor } from '@dxos/react-ui-form';
import { type TableType } from '@dxos/react-ui-table';

import { TABLE_PLUGIN } from '../meta';
import { TableAction } from '../types';

type TableViewEditorProps = { table: TableType };

const TableViewEditor = ({ table }: TableViewEditorProps) => {
  const dispatch = useIntentDispatcher();
  const space = getSpace(table);

  // TODO(ZaymonFC): The schema registry needs an API where we can query with initial value and
  // endure typename changes. We shouldn't need to manage a subscription at this layer.
  const [schema, setSchema] = useState(
    space && table?.view?.query?.typename ? space.db.schemaRegistry.getSchema(table.view.query.typename) : undefined,
  );
  useEffect(() => {
    if (space && table?.view?.query?.typename) {
      const unsubscribe = space.db.schemaRegistry.subscribe((schemas) => {
        const schema = schemas.find((schema) => schema.typename === table?.view?.query?.typename);
        if (schema) {
          setSchema(schema);
        }
      });

      return unsubscribe;
    }
  }, [space, table?.view?.query?.typename]);

  const handleDelete = useCallback(
    (fieldId: string) => {
      void dispatch?.({
        plugin: TABLE_PLUGIN,
        action: TableAction.DELETE_COLUMN,
        data: { table, fieldId },
      });
    },
    [dispatch, table],
  );

  if (!space || !schema || !table.view) {
    return null;
  }

  return <ViewEditor registry={space.db.schemaRegistry} schema={schema} view={table.view} onDelete={handleDelete} />;
};

export default TableViewEditor;
