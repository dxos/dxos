//
// Copyright 2023 DXOS.org
//

import React, { type FC, useEffect, useMemo, useState, useCallback } from 'react';

import { useFilteredObjects } from '@braneframe/plugin-search';
import { TableType, type TableTypeProp } from '@braneframe/types';
import { type DynamicEchoSchema, S, create, TypedObject, type EchoReactiveObject, Filter } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { getSpace, type Space, useQuery } from '@dxos/react-client/echo';
import { DensityProvider } from '@dxos/react-ui';
import { Table, type TableDef, type TableProps } from '@dxos/react-ui-table';

// TODO(burdon): Remove deps.
import { getSchema, schemaPropMapper, createColumnsFromTableDef } from '../../schema';
import { TableSettings } from '../TableSettings';

export type ObjectTableProps = Pick<TableProps<any>, 'stickyHeader' | 'role' | 'getScrollElement'> & {
  table: TableType;
};

// TODO(Zan): Consolidate.
const Stable = {
  empty: {
    object: Object.freeze({}),
    array: Object.freeze([] as any[]),
  },
};

// -- Hooks
// TODO(Zan): Move them to a file
//            They are here rn so I can think

const useObjects = (space?: Space, schema?: S.Schema<any>) => {
  const objectFilter = useMemo(() => (schema ? Filter.schema(schema) : () => false), [schema]);

  const objects = useQuery<EchoReactiveObject<any>>(
    space,
    objectFilter,
    Stable.empty.object,
    // TODO(burdon): Toggle deleted.
    [schema],
  );

  return useFilteredObjects(objects);
};

const useTables = (space?: Space) => {
  const tableFilter = useMemo(() => Filter.schema(TableType), []);
  return useQuery<TableType>(space, tableFilter);
};

const useUpdateProperty = (table: TableType) => {
  const updateSchemaProp = useCallback(
    (update: S.Struct.Fields) => {
      return table.schema?.updateColumns(update);
    },
    [table.schema],
  );

  const updateSchemaPropName = useCallback(
    (before: PropertyKey, after: PropertyKey) => {
      return table.schema?.updateColumnName({ before, after });
    },
    [table.schema],
  );

  const updateTableProp = useCallback(
    (oldId: string, update: TableTypeProp) => {
      const idx = table.props?.findIndex((prop) => prop.id === oldId);

      if (idx !== -1) {
        const current = table.props![idx];
        table.props.splice(idx, 1, { ...current, ...update });
      } else {
        table.props.push(update);
      }
    },
    [table.props],
  );

  return { updateSchemaProp, updateSchemaPropName, updateTableProp };
};

// TODO(Zan): Better name.
const ObjectTableTable: FC<ObjectTableProps> = ({ table, role, stickyHeader, getScrollElement }) => {
  const space = getSpace(table);

  const objects = useObjects(space, table.schema);
  const tables = useTables(space);

  // TODO(zan): New object should probably be a ref? (Why should we re-create the columns when adding rows)
  const [newObject, setNewObject] = useState({});
  const rows = useMemo(() => [...objects, newObject], [objects, newObject]);

  const { updateSchemaProp, updateSchemaPropName, updateTableProp } = useUpdateProperty(table);

  const columns = useMemo(() => {
    if (!space || !table.schema || !tables.length) {
      return [];
    }

    const tableDefs: TableDef[] = tables
      .filter((table) => table.schema)
      .map((table) => ({
        id: table.schema!.id,
        name: table.title ?? table.schema?.typename,
        columns: table.schema!.getProperties().map(schemaPropMapper(table)),
      }));

    const tableDef = tableDefs.find((tableDef) => tableDef.id === table.schema?.id);

    if (!tableDef) {
      return [];
    }

    return createColumnsFromTableDef({
      tableDef,
      tablesToReference: tableDefs,
      space: space!,
      onColumnUpdate: (oldId, column) => {
        const { id, type, refTable, refProp, digits, label } = column;
        updateTableProp(oldId, { id, refProp, label });

        updateSchemaProp({
          [oldId]: getSchema(tables, type, { digits, refTable, refProp }),
        });

        if (oldId !== column.id) {
          updateSchemaPropName(oldId, id);
        }
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
  }, [space, tables, table, table.schema, newObject]);

  const handleColumnResize = useCallback(
    (state: Record<string, number>) => {
      Object.entries(state).forEach(([id, size]) => updateTableProp(id, { id, size }));
    },
    [updateTableProp],
  );

  const debug = true;

  if (!space) {
    return null;
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
          <pre className='flex-1'>{JSON.stringify(table.props, undefined, 2)}</pre>
          <pre className='flex-1'>{JSON.stringify((table.schema as any)?._schema, undefined, 2)}</pre>
        </div>
      )}
    </DensityProvider>
  );
};

export const ObjectTable: FC<ObjectTableProps> = ({ table, role, stickyHeader, getScrollElement }) => {
  const space = getSpace(table);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => setShowSettings(!table.schema), [table.schema]);

  const handleClose = (success: boolean) => {
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
  };

  const [schemas, setSchemas] = useState<DynamicEchoSchema[]>([]);

  useEffect(() => {
    if (space) {
      setSchemas(space.db.schemaRegistry.getAll());
    }
  }, [showSettings, space]);

  if (!space) {
    return null;
  }

  if (showSettings) {
    return <TableSettings open={showSettings} table={table} schemas={schemas} onClose={handleClose} />;
  } else {
    return (
      <ObjectTableTable table={table} role={role} stickyHeader={stickyHeader} getScrollElement={getScrollElement} />
    );
  }
};
