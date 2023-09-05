//
// Copyright 2023 DXOS.org
//

import React, { FC, useMemo } from 'react';

import { SpacePluginProvides } from '@braneframe/plugin-space';
import { Schema as SchemaType, Table as TableType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { Grid, createColumns, GridSchemaColumn, createActionColumn } from '@dxos/aurora-grid';
import { coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';
import { Expando, TypedObject } from '@dxos/client/echo';
import { useQuery } from '@dxos/react-client/echo';
import { findPlugin, usePlugins } from '@dxos/react-surface';

const getColumnType = (type?: SchemaType.PropType): GridSchemaColumn['type'] => {
  switch (type) {
    case SchemaType.PropType.BOOLEAN:
      return 'boolean';
    case SchemaType.PropType.NUMBER:
      return 'number';
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
    case 'string':
    default:
      return SchemaType.PropType.STRING;
  }
};

export const TableMain: FC<{ data: TableType }> = ({ data: table }) => {
  const { plugins } = usePlugins();
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
        header: label,
        editable: true,
        resize: true,
      })),
    };

    const columns = createColumns<TypedObject>(schema, {
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
      onColumnCreate: ({ id, type, label }) => {
        table.schema?.props.push({ id, type: getPropType(type), label });
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
        const props = { id, size };
        if (!table.props) {
          table.props = [props];
        } else {
          table.props.push(props);
        }
      }
    });
  };

  return (
    <Main.Content classNames={[fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <Grid<TypedObject> columns={columns} data={rows} onColumnResize={handleColumnResize} />
    </Main.Content>
  );
};
