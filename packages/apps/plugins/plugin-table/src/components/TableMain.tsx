//
// Copyright 2023 DXOS.org
//

import React, { type FC, useMemo, useState } from 'react';

import { useFilteredObjects } from '@braneframe/plugin-search';
import { type SpacePluginProvides } from '@braneframe/plugin-space';
import { Table as TableType } from '@braneframe/types';
import { Expando, type TypedObject, type Schema as SchemaType } from '@dxos/client/echo';
import { useQuery } from '@dxos/react-client/echo';
import { findPlugin, usePlugins } from '@dxos/react-surface';
import { DensityProvider, Main } from '@dxos/react-ui';
import { Table, type TableDef } from '@dxos/react-ui-table';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { getSchemaType, schemaPropMapper, TableColumnBuilder } from '../schema';

// TODO(burdon): Factor out echo fn to update when changed.
const reactDeps = (...obj: TypedObject[]) => {
  return JSON.stringify(obj);
};

export const TableMain: FC<{ data: TableType }> = ({ data: table }) => {
  const [, forceUpdate] = useState({});

  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides?.space.active;
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
      name: table.schema.typename ?? table.title, // TODO(burdon): Typename?
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
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <DensityProvider density='fine'>
        <div className='flex grow m-4 overflow-hidden'>
          <Table<TypedObject>
            keyAccessor={(row) => row.id ?? '__new'}
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
