//
// Copyright 2024 DXOS.org
//

import React, { type FC, useEffect, useMemo, useState, useCallback, useRef } from 'react';

import { TableType } from '@braneframe/types';
import { type DynamicEchoSchema, S, create, TypedObject, Filter } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { DensityProvider } from '@dxos/react-ui';
import { type ColumnProps, Table, type TableProps } from '@dxos/react-ui-table';

import { useTableObjects } from './hooks';
import { createColumns, updateTableProp } from './utils';
import { getSchema } from '../../schema';
import { TableSettings } from '../TableSettings';

export type ObjectTableProps = Pick<TableProps<any>, 'stickyHeader' | 'role' | 'getScrollElement'> & {
  table: TableType;
};

export const ObjectTable: FC<ObjectTableProps> = ({ table, role, stickyHeader, getScrollElement }) => {
  const space = getSpace(table);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => setShowSettings(!table.schema), [table.schema]);

  const handleClose = useCallback(
    (success: boolean) => {
      // TODO(burdon): If cancel then undo create?
      if (!success || !space) {
        return;
      }

      if (!table.schema) {
        table.schema = space.db.schemaRegistry.add(
          TypedObject({ typename: `example.com/schema/${PublicKey.random().truncate()}`, version: '0.1.0' })({
            title: S.optional(S.string),
          }),
        );
      }

      setShowSettings(false);
    },
    [space, table.schema, setShowSettings],
  );

  const [schemas, setSchemas] = useState<DynamicEchoSchema[]>([]);

  useEffect(() => {
    if (space) {
      space.db.schemaRegistry.getAll().then(setSchemas);
    }
  }, [showSettings, space]);

  if (!space) {
    return null;
  }

  if (showSettings) {
    return <TableSettings open={showSettings} table={table} schemas={schemas} onClose={handleClose} />;
  } else {
    return (
      <ObjectTableImpl table={table} role={role} stickyHeader={stickyHeader} getScrollElement={getScrollElement} />
    );
  }
};

const ObjectTableImpl: FC<ObjectTableProps> = ({ table, role, stickyHeader, getScrollElement }) => {
  const space = getSpace(table);

  const objects = useTableObjects(space, table.schema);
  const tables = useQuery<TableType>(space, Filter.schema(TableType));

  const newObject = useRef({});
  const newObjectKey = '__new';
  const keyAccessor = useCallback(
    (row: any) => (row === newObject.current ? newObjectKey : row?.id ?? 'KEY'),
    [newObjectKey],
  );

  const rows = useMemo(() => [...objects, newObject.current], [objects]);

  const onColumnUpdate = useCallback(
    (oldId: string, column: ColumnProps) => {
      const { id, type, refTable, refProp, digits, label } = column;
      updateTableProp(table.props, oldId, { id, refProp, label });
      table.schema?.updateColumns({
        [oldId]: getSchema(tables, type, { digits, refTable, refProp }),
      });
      if (oldId !== column.id) {
        table.schema?.updatePropertyName({ before: oldId, after: id });
      }
    },
    [table.props, table.schema, tables],
  );

  const onColumnDelete = useCallback((id: string) => table.schema?.removeColumns([id]), [table.schema]);

  const onRowUpdate = useCallback(
    (object: any, prop: string, value: any) => {
      object[prop] = value;
      if (object === newObject.current) {
        space!.db.add(create(table.schema!, { ...newObject.current }));
        newObject.current = {};
      }
    },
    [space, table.schema, newObject],
  );

  const onRowDelete = useCallback((object: any) => space!.db.remove(object), [space]);

  const columns = useMemo(
    () => createColumns(space, tables, table, onColumnUpdate, onColumnDelete, onRowUpdate, onRowDelete),
    [space, tables, table, onColumnUpdate, onColumnDelete, onRowUpdate, onRowDelete],
  );

  const handleColumnResize = useCallback(
    (state: Record<string, number>) => {
      Object.entries(state).forEach(([id, size]) => updateTableProp(table.props, id, { id, size }));
    },
    [updateTableProp],
  );

  const debug = false;

  if (!space) {
    return null;
  }

  return (
    <DensityProvider density='fine'>
      <Table<any>
        keyAccessor={keyAccessor}
        columns={columns}
        data={rows}
        border
        role={role ?? 'grid'}
        stickyHeader={stickyHeader}
        getScrollElement={getScrollElement}
        onColumnResize={handleColumnResize}
        pinLastRow
      />
      {debug && (
        <div className='flex text-xs'>
          <pre className='flex-1'>{JSON.stringify(table.props, undefined, 2)}</pre>
          <pre className='flex-1'>{JSON.stringify((table.schema as any)?._schema, undefined, 2)}</pre>
        </div>
      )}
    </DensityProvider>
  );
};
