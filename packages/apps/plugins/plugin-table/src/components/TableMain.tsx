//
// Copyright 2023 DXOS.org
//

import React, { type FC, useMemo, useState } from 'react';

import { useFilteredObjects } from '@braneframe/plugin-search';
import { Table as TableType } from '@braneframe/types';
import { Expando, type TypedObject, type Schema, getSpaceForObject, useQuery } from '@dxos/react-client/echo';
import { DensityProvider, Main } from '@dxos/react-ui';
import { Table, type TableDef } from '@dxos/react-ui-table';
import { baseSurface, chromeSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { getSchema, schemaPropMapper, TableColumnBuilder } from '../schema';

// TODO(burdon): Factor out echo fn to update when changed.
const reactDeps = (...obj: TypedObject[]) => {
  return JSON.stringify(obj);
};

// TODO(burdon): Section container with chrome.
export const TableSection: FC<{ table: TableType }> = ({ table }) => {
  return (
    <div className={'flex h-[386px] my-2 overflow-hidden'}>
      <TableComponent table={table} />
    </div>
  );
};

export const TableSlide: FC<{ table: TableType }> = ({ table }) => {
  return (
    <div className={'flex p-24 overflow-hidden'}>
      <TableComponent table={table} />
    </div>
  );
};

export const TableMain: FC<{ table: TableType }> = ({ table }) => {
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <div className={'flex grow m-4 overflow-hidden'}>
        <TableComponent table={table} />
      </div>
    </Main.Content>
  );
};

export const TableComponent: FC<{ table: TableType }> = ({ table }) => {
  const [, forceUpdate] = useState({});
  const space = getSpaceForObject(table);
  const objects = useQuery<TypedObject>(
    space,
    // TODO(dmaretskyi): Reference comparison broken by deepsignal wrapping.
    (object) => (object.__schema as any)?.id === table.schema.id,
    // TODO(burdon): Toggle deleted.
    {},
    [table.schema],
  );

  const [newObject, setNewObject] = useState(new Expando({}, { schema: table.schema }));
  const rows = [...useFilteredObjects(objects), newObject];

  const tables = useQuery<TableType>(space, TableType.filter());
  const updateSchemaProp = (update: Schema.Prop) => {
    const idx = table.schema?.props.findIndex((prop) => prop.id === update.id);
    if (idx !== -1) {
      const current = table.schema?.props[idx];
      table.schema?.props.splice(idx, 1, { ...current, ...update });
    } else {
      table.schema?.props.push(update);
    }
  };

  const updateTableProp = (update: TableType.Prop) => {
    const idx = table.props?.findIndex((prop) => prop.id === update.id);
    if (idx !== -1) {
      const current = table.props![idx];
      table.props.splice(idx, 1, { ...current, ...update });
    } else {
      table.props.push(update);
    }
  };

  const columns = useMemo(() => {
    if (!space || !tables.length) {
      return [];
    }

    const tableDefs: TableDef[] = tables.map((table) => ({
      id: table.schema.id,
      name: table.schema.typename ?? table.title, // TODO(burdon): Typename?
      columns: table.schema.props.map(schemaPropMapper(table)),
    }));

    const builder = new TableColumnBuilder(tableDefs, table.schema?.id, space!, {
      onColumnUpdate: (id, column) => {
        const { type, refTable, refProp, digits, label } = column;
        updateTableProp({ id, refProp, label });
        updateSchemaProp({
          id,
          type: getSchema(type),
          ref: type === 'ref' ? tables.find((table) => table.schema.id === refTable)?.schema : undefined,
          digits,
        });
        forceUpdate({});
      },
      onColumnDelete: (id) => {
        const idx = table.schema?.props.findIndex((prop) => prop.id === id);
        if (idx !== -1) {
          table.schema?.props.splice(idx, 1);
          forceUpdate({});
        }
      },
      onRowUpdate: (object, prop, value) => {
        object[prop] = value;
        if (object === newObject) {
          // TODO(burdon): Silent exception if try to add plain object directly.
          space!.db.add(newObject);
          setNewObject(new Expando({}, { schema: table.schema }));
        }
      },
      onRowDelete: (object) => {
        // TODO(burdon): Rename delete.
        space!.db.remove(object);
      },
    });

    return builder.createColumns();
  }, [space, tables, reactDeps(table, table.schema), newObject]);

  const handleColumnResize = (state: Record<string, number>) => {
    Object.entries(state).forEach(([id, size]) => {
      updateTableProp({ id, size });
    });
  };

  const debug = false;

  return (
    <DensityProvider density='fine'>
      <div className='flex flex-col grow overflow-hidden'>
        <Table<TypedObject>
          keyAccessor={(row) => row.id ?? '__new'}
          columns={columns}
          data={rows}
          border
          slots={{
            header: { className: [chromeSurface, 'px-2 font-light select-none'] },
            footer: { className: [chromeSurface, 'px-2 font-light'] },
            group: { className: 'px-2 font-light text-xs text-left' },
            focus: { className: 'ring ring-primary-600 ring-inset' },
            selected: { className: '!bg-teal-100 dark:!bg-teal-700' },
          }}
          onColumnResize={handleColumnResize}
        />
        {debug && (
          <div className='flex text-xs'>
            <pre className='flex-1'>{JSON.stringify(table, undefined, 2)}</pre>
            <pre className='flex-1'>{JSON.stringify(table.schema, undefined, 2)}</pre>
          </div>
        )}
      </div>
    </DensityProvider>
  );
};
