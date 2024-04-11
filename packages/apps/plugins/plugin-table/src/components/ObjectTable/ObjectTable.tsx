//
// Copyright 2023 DXOS.org
//

import React, { type FC, useEffect, useMemo, useState, useCallback } from 'react';

import { useFilteredObjects } from '@braneframe/plugin-search';
import { TableType, type TableTypeProp } from '@braneframe/types';
import { S, create } from '@dxos/echo-schema';
import { TypedObject, type EchoReactiveObject, Filter } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { DensityProvider } from '@dxos/react-ui';
import { Table, type TableDef, type TableProps } from '@dxos/react-ui-table';

// TODO(burdon): Remove deps.
import { getSchema, schemaPropMapper, TableColumnBuilder } from '../../schema';
import { TableSettings } from '../TableSettings';

export type ObjectTableProps = Pick<TableProps<any>, 'stickyHeader' | 'role' | 'getScrollElement'> & {
  table: TableType;
};

const Stable = {
  empty: {
    object: Object.freeze({}),
    array: Object.freeze([] as any[]),
  },
};

export const ObjectTable: FC<ObjectTableProps> = ({ table, role, stickyHeader, getScrollElement }) => {
  const space = getSpace(table);

  const objectFilter = useMemo(() => (table.schema ? Filter.schema(table.schema) : () => false), [table.schema]);

  const objects = useQuery<EchoReactiveObject<any>>(
    space,
    objectFilter,
    Stable.empty.object,
    // TODO(burdon): Toggle deleted.
    [table.schema],
  );

  const filteredObjects = useFilteredObjects(objects);

  const [newObject, setNewObject] = useState({});

  const rows = useMemo(() => [...filteredObjects, newObject], [filteredObjects, newObject]);

  const tableFilter = useMemo(() => Filter.schema(TableType), []);
  const tables = useQuery<TableType>(space, tableFilter);

  const updateSchemaProp = useCallback(
    (update: S.Struct.Fields) => table.schema?.updateColumns(update),
    [table.schema],
  );

  const updateTableProp = useCallback(
    (update: TableTypeProp) => {
      const idx = table.props?.findIndex((prop) => prop.id === update.id);
      if (idx !== -1) {
        const current = table.props![idx];
        table.props.splice(idx, 1, { ...current, ...update });
      } else {
        table.props.push(update);
      }
    },
    [table.props],
  );

  const columns = useMemo(() => {
    if (!space || !table.schema || !tables.length) {
      return [];
    }

    const tableDefs: TableDef[] = tables
      .filter((table) => table.schema)
      .map((table) => ({
        id: table.schema!.id,
        name: table.schema?.typename ?? table.title,
        columns: table.schema!.getProperties().map(schemaPropMapper(table)),
      }));

    const builder = new TableColumnBuilder(tableDefs, table.schema?.id, space!, {
      onColumnUpdate: (id, column) => {
        const { type, refTable, refProp, digits, label } = column;
        updateTableProp({ id, refProp, label });
        updateSchemaProp({
          [id]: getSchema(tables, type, { digits, refTable, refProp }),
        });
      },
      onColumnDelete: (id) => table.schema?.removeColumns([id]),
      onRowUpdate: (object, prop, value) => {
        object[prop] = value;
        if (object === newObject) {
          // TODO(burdon): Silent exception if try to add plain object directly.
          space!.db.add(create(table.schema!, { ...newObject }));
          setNewObject({});
        }
      },
      onRowDelete: (object) => {
        // TODO(burdon): Rename delete.
        space!.db.remove(object);
      },
    });

    return builder.createColumns();
  }, [space, tables, table, table.schema, newObject]);

  const handleColumnResize = useCallback(
    (state: Record<string, number>) => {
      Object.entries(state).forEach(([id, size]) => updateTableProp({ id, size }));
    },
    [updateTableProp],
  );

  const debug = false;

  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setShowSettings(!table.schema);
  }, [table]);

  if (!space) {
    return null;
  }

  const handleClose = (success: boolean) => {
    // TODO(burdon): If cancel then undo create?
    if (!success) {
      return;
    }

    if (!table.schema) {
      table.schema = space.db.schemaRegistry.add(
        TypedObject({ typename: `example.com/schema/${PublicKey.random().truncate()}`, version: '0.1.0' })({
          title: S.string,
        }),
      );
    }

    setShowSettings(false);
  };

  const [schemas, setSchemas] = useState<E.DynamicEchoSchema[]>([]);
  useEffect(() => {
    setSchemas(space.db.schemaRegistry.getAll());
  }, [showSettings, space.db.schemaRegistry]);

  if (showSettings) {
    return <TableSettings open={showSettings} table={table} schemas={schemas} onClose={handleClose} />;
  }

  return (
    <DensityProvider density='fine'>
      <Table<any>
        keyAccessor={(row) => row.id ?? '__new'}
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
          <pre className='flex-1'>{JSON.stringify(table, undefined, 2)}</pre>
          <pre className='flex-1'>{JSON.stringify(table.schema, undefined, 2)}</pre>
        </div>
      )}
    </DensityProvider>
  );
};
