//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { SpacePluginProvides } from '@braneframe/plugin-space';
import { Schema as SchemaType, Table as TableType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { Grid, createColumns, GridSchemaColumn } from '@dxos/aurora-grid';
import { coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';
import { Expando, TypedObject } from '@dxos/client/echo';
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
  // TODO(burdon): Show deleted.
  // TODO(burdon): useQuery hook.
  const subscription = space?.db.query((object) => {
    return table.schema?.typename && object.type === table.schema.typename; // TODO(burdon): Use __typename.
  });

  const objects: Expando[] = [
    ...(subscription?.objects ?? []),
    // TODO(burdon): Pending.
    {} as Expando,
  ];

  // TODO(burdon): useMemo.
  // TODO(burdon): Settings dialog to change typename.
  const columns = createColumns<TypedObject>(
    {
      columns: table.schema?.props.map(({ id, type, label, size }) => ({
        id: id!,
        type: getColumnType(type),
        size: table.props?.find((prop) => prop.id === id)?.size ?? size,
        header: label,
        editable: true,
        resize: true,
      })),
    },

    // TODO(burdon): Change API.
    // TODO(burdon): Update size.
    {
      onUpdate: (object, prop, value) => {
        // TODO(burdon): Check only called if value changed.
        object[prop] = value;
        if (!object.id) {
          // TODO(burdon): Set __typename?
          // TODO(burdon): Silent invariant error if adding object directly (i.e., not Expando).
          space!.db.add(new Expando(Object.assign(object, { type: table.schema.typename })));
        }
      },
      onRowDelete: (object) => {
        // TODO(burdon): Rename delete.
        space!.db.remove(object);
      },
      onColumnCreate: ({ id, type, header }) => {
        table.schema?.props.push({ id, type: getPropType(type), label: header });
      },
    },
  );

  const handleColumnResize = (state: Record<string, number>) => {
    Object.entries(state).forEach(([id, size]) => {
      const idx = table.props?.findIndex((prop) => prop.id === id);
      if (idx !== -1) {
        // TODO(burdon): Doesn't save if update directly.
        table.props.splice(idx, 1, { id, size });
      } else {
        const props = { id, size };
        // TODO(burdon): Can't push to empty array.
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
      <Grid<TypedObject> columns={columns} data={objects} onColumnResize={handleColumnResize} />
    </Main.Content>
  );
};
