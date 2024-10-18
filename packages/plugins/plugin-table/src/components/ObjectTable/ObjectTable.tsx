//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { create, type MutableSchema, S, TypedObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { type ColumnDef, Table, type TableProps } from '@dxos/react-ui-table';
import { arrayMove } from '@dxos/util';

import { useTableObjects } from './hooks';
import { createColumns, deleteTableProp, updateTableProp } from './utils';
import { getSchema } from '../../schema';
import { TableType } from '../../types';
import { TableSettings } from '../TableSettings';

const makeStarterTableSchema = () => {
  return TypedObject({ typename: `example.com/type/${PublicKey.random().truncate()}`, version: '0.1.0' })({
    title: S.optional(S.String),
  });
};

export type ObjectTableProps = Pick<TableProps<any>, 'stickyHeader' | 'role'> & {
  table: TableType;
};

export const ObjectTable = ({ table, role, stickyHeader }: ObjectTableProps) => {
  const space = getSpace(table);
  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => setShowSettings(!table.schema), [table.schema]);

  const [schemas, setSchemas] = useState<MutableSchema[]>([]);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (space) {
        const schemata = await space.db.schema.list();
        setSchemas(schemata);
      }
    });
    return () => clearTimeout(t);
  }, [showSettings, space]);

  const handleClose = useCallback(() => {
    if (!space) {
      return;
    }

    if (!table.schema) {
      table.schema = space.db.schema.addSchema(makeStarterTableSchema());
      updateTableProp(table.props, 'title', { id: 'title', label: 'Title' });
    }

    setShowSettings(false);
  }, [space, table.schema, setShowSettings]);

  if (!space) {
    return null;
  }

  if (showSettings) {
    return <TableSettings table={table} schemas={schemas} onClickContinue={handleClose} />;
  }

  return <ObjectTableImpl table={table} role={role} stickyHeader={stickyHeader} />;
};

const createTable = (table: TableType) => (table.schema ? create(table.schema, {}) : create({}));

const ObjectTableImpl = ({ table, role, stickyHeader }: ObjectTableProps) => {
  const space = getSpace(table);

  const objects = useTableObjects(space, table.schema);
  const tables = useQuery<TableType>(space, Filter.schema(TableType));

  const newObject = useRef(createTable(table));
  const rows = useMemo(() => [...objects, newObject.current], [objects]);

  const onColumnUpdate = useCallback(
    (oldId: string, column: ColumnDef) => {
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

  const onColumnDelete = useCallback(
    (id: string) => {
      table.schema?.removeColumns([id]);
      deleteTableProp(table.props, id);
    },
    [table.schema, table.props],
  );

  const onRowUpdate = useCallback(
    (object: any, prop: string, value: any) => {
      object[prop] = value;
      if (object === newObject.current) {
        space!.db.add(newObject.current);
        newObject.current = createTable(table);
      }
    },
    [space, table.schema, newObject],
  );

  const onRowDelete = useCallback((object: any) => space!.db.remove(object), [space]);

  const onColumnReorder = useCallback(
    (columnId: string, direction: 'right' | 'left') => {
      // Find the prop with the given id.
      const index = table.props.findIndex((prop) => prop.id === columnId);
      if (index === -1) {
        return;
      }

      // Find the prop to swap with.
      const swapIndex = direction === 'right' ? index + 1 : index - 1;
      if (swapIndex < 0 || swapIndex >= table.props.length) {
        return;
      }

      arrayMove(table.props, index, swapIndex);
    },
    [table.props],
  );

  const columns = useMemo(
    () =>
      createColumns(space, tables, table, onColumnUpdate, onColumnDelete, onColumnReorder, onRowUpdate, onRowDelete),
    [space, tables, table, onColumnUpdate, onColumnDelete, onRowUpdate, onRowDelete],
  );

  const handleColumnResize = useCallback(
    (state: Record<string, number>) => {
      Object.entries(state).forEach(([id, size]) => updateTableProp(table.props, id, { id, size }));
    },
    [updateTableProp],
  );

  if (!space) {
    return null;
  }

  const debug = false;
  return (
    <>
      <Table.Main<any>
        keyAccessor={(row: any) => row.id}
        columns={columns}
        data={rows}
        border
        role={role ?? 'grid'}
        stickyHeader={stickyHeader}
        onColumnResize={handleColumnResize}
        pinLastRow
      />
      {debug && (
        <div className='flex text-xs'>
          <pre className='flex-1'>{JSON.stringify(table.props, undefined, 2)}</pre>
          <pre className='flex-1'>{JSON.stringify((table.schema as any)?._schema, undefined, 2)}</pre>
        </div>
      )}
    </>
  );
};
