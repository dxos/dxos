//
// Copyright 2023 DXOS.org
//

import React, { FC, useMemo, useState } from 'react';

import { SpacePluginProvides } from '@braneframe/plugin-space';
import { Schema as SchemaType, Table as TableType } from '@braneframe/types';
import { DensityProvider, Main } from '@dxos/aurora';
import { Grid, createColumns, GridSchemaColumn, createActionColumn } from '@dxos/aurora-grid';
import { coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';
import { Expando, TypedObject } from '@dxos/client/echo';
import { useQuery } from '@dxos/react-client/echo';
import { findPlugin, usePlugins } from '@dxos/react-surface';

const EMPTY_ROW_ID = '__new';

const getColumnType = (type?: SchemaType.PropType): GridSchemaColumn['type'] => {
  switch (type) {
    case SchemaType.PropType.BOOLEAN:
      return 'boolean';
    case SchemaType.PropType.NUMBER:
      return 'number';
    case SchemaType.PropType.DATE:
      return 'date';
    case SchemaType.PropType.STRING:
    default:
      return 'string';
  }
};

const getPropType = (type?: GridSchemaColumn['type']): SchemaType.PropType => {
  switch (type) {
    case 'boolean':
      return SchemaType.PropType.BOOLEAN;
    case 'number':
      return SchemaType.PropType.NUMBER;
    case 'date':
      return SchemaType.PropType.DATE;
    case 'string':
    default:
      return SchemaType.PropType.STRING;
  }
};

export const TableMain: FC<{ data: TableType }> = ({ data: table }) => {
  const { plugins } = usePlugins();
  const [, forceUpdate] = useState({});
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides?.space.active;
  // TODO(burdon): Not updated when object deleted.
  const objects = useQuery<TypedObject>(
    space,
    // TODO(burdon): System meta property.
    (object) => object.meta?.schema?.id === table.schema.id,
    {}, // TODO(burdon): Toggle deleted.
    [table.schema],
  );

  // TODO(burdon): Don't show delete icon for placeholder row.
  const rows = [...objects, {} as any];

  // TODO(burdon): Settings dialog to change typename.
  const columns = useMemo(() => {
    const schema = {
      columns: table.schema?.props.map(({ id, type, label }) => ({
        id: id!,
        type: getColumnType(type),
        size: table.props?.find((prop) => prop.id === id)?.size,
        label,
        editable: true,
        resize: true,
      })),
    };

    const columns = createColumns<TypedObject>(schema, {
      // TODO(burdon): Doesn't refresh.
      // TODO(burdon): Doesn't close popover.
      onColumnUpdate: (id, column) => {
        const idx = table.schema?.props.findIndex((prop) => prop.id === id);
        if (idx !== -1) {
          const { id, type, label, digits } = column;
          table.schema?.props.splice(idx, 1, { id, type: getPropType(type), label, digits });
          forceUpdate({}); // TODO(burdon): Fix refresh.
        }
      },
      onColumnDelete: (id) => {
        const idx = table.schema?.props.findIndex((prop) => prop.id === id);
        if (idx !== -1) {
          table.schema?.props.splice(idx, 1);
          forceUpdate({}); // TODO(burdon): Fix refresh.
        }
      },
      // TODO(burdon): Check only called by grid if value changed.
      onUpdate: (object, prop, value) => {
        object[prop] = value;
        if (!object.id) {
          // TODO(burdon): Silent invariant error if adding object directly (i.e., not Expando).
          space!.db.add(new Expando(Object.assign(object, { meta: { schema: table.schema } })));
        }
      },
    });

    const actionColumn = createActionColumn<TypedObject>(schema, {
      isDeletable: (row) => !!row.id,
      onColumnCreate: ({ id, type, label, digits }) => {
        table.schema?.props.push({ id, type: getPropType(type), label, digits });
        forceUpdate({}); // TODO(burdon): Fix refresh.
      },
      onRowDelete: (object) => {
        // TODO(burdon): Rename delete.
        space!.db.remove(object);
      },
    });

    return [...columns, actionColumn];
  }, [space, JSON.stringify(table), JSON.stringify(table.schema)]); // TODO(burdon): Impl. echo useMemo-like hook.

  const handleColumnResize = (state: Record<string, number>) => {
    Object.entries(state).forEach(([id, size]) => {
      const idx = table.props?.findIndex((prop) => prop.id === id);
      if (idx !== -1) {
        table.props[idx] = { id, size };
      } else {
        (table.props ??= []).push({ id, size });
      }
    });
  };

  return (
    <Main.Content classNames={[fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <DensityProvider density='fine'>
        <div className='flex grow -ml-[1px] -mt-[1px] overflow-hidden'>
          <Grid<TypedObject>
            keyAccessor={(row) => row.original.id ?? EMPTY_ROW_ID}
            columns={columns}
            data={rows}
            onColumnResize={handleColumnResize}
            border
          />
        </div>
      </DensityProvider>
    </Main.Content>
  );
};
