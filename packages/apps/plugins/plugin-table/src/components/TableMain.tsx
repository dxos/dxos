//
// Copyright 2023 DXOS.org
//

import React, { type FC, useMemo, useState } from 'react';

import { useFilteredObjects } from '@braneframe/plugin-search';
import { type SpacePluginProvides } from '@braneframe/plugin-space';
import { Table as TableType } from '@braneframe/types';
import { DensityProvider, Main } from '@dxos/aurora';
import { Table, type TableDef } from '@dxos/aurora-table';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';
import { Expando, type TypedObject, type Schema as SchemaType } from '@dxos/client/echo';
import { useQuery } from '@dxos/react-client/echo';
import { findPlugin, usePlugins } from '@dxos/react-surface';

import { getSchemaType, schemaPropMapper, TableColumnBuilder } from '../schema';

const EMPTY_ROW_ID = '__new';

export const TableMain: FC<{ data: TableType }> = ({ data: table }) => {
  const [, forceUpdate] = useState({});
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides?.space.active;
  // TODO(burdon): Not updated when object deleted.
  const tables = useQuery<TableType>(space, TableType.filter());
  const objects = useQuery<TypedObject>(
    space,
    // TODO(dmaretskyi): Reference comparison broken by deepsignal wrapping.
    (object) => (object.__schema as any)?.id === table.schema.id,
    // TODO(burdon): Toggle deleted.
    {},
    [table.schema],
  );

  const rows = useFilteredObjects(objects);

  const updateSchemaProp = (update: SchemaType.Prop) => {
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
      name: table.schema.typename ?? table.title,
      columns: table.schema.props.map(schemaPropMapper(table)),
    }));

    const builder = new TableColumnBuilder(tableDefs, table.schema?.id, space!, {
      onColumnUpdate: (id, column) => {
        const { type, refTable, refProp, digits, label } = column;
        updateTableProp({ id, refProp, label });
        updateSchemaProp({
          id,
          type: getSchemaType(type),
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
        if (!object.id) {
          // TODO(burdon): Add directly.
          const obj = new Expando(object, { schema: table.schema });
          // TODO(burdon): Silent exception if try to add plain object directly.
          space!.db.add(obj);
        }
      },
      onRowDelete: (object) => {
        // TODO(burdon): Rename delete.
        space!.db.remove(object);
      },
    });

    return builder.createColumns();
  }, [space, tables, JSON.stringify(table), JSON.stringify(table.schema)]); // TODO(burdon): Impl. echo useMemo-like hook.

  const handleColumnResize = (state: Record<string, number>) => {
    Object.entries(state).forEach(([id, size]) => {
      updateTableProp({ id, size });
    });
  };

  const debug = false;

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <DensityProvider density='fine'>
        <div className='flex grow m-4 overflow-hidden'>
          <Table<TypedObject>
            keyAccessor={(row) => row.id ?? EMPTY_ROW_ID}
            columns={columns}
            data={rows}
            border
            onColumnResize={handleColumnResize}
          />
        </div>
        {debug && (
          <div className='flex text-xs'>
            <pre className='flex-1'>{JSON.stringify(table, undefined, 2)}</pre>
            <pre className='flex-1'>{JSON.stringify(table.schema, undefined, 2)}</pre>
          </div>
        )}
      </DensityProvider>
    </Main.Content>
  );
};
