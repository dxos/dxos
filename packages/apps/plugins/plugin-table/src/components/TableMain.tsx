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
    console.log('==', object.__typename);
    return table.schema?.typename && object.__typename === table.schema.typename;
  });

  const objects: Expando[] = [
    ...(subscription?.objects ?? []),
    // TODO(burdon): Pending.
    {} as Expando,
  ];

  // TODO(burdon): Settings dialog to change typename.
  const columns = createColumns<TypedObject>(
    {
      columns: table.schema?.props.map(({ id, type, label, size }) => ({
        id: id!,
        type: getColumnType(type),
        size,
        header: label,
        editable: true,
        resize: true,
      })),
    },
    // TODO(burdon): Change API.
    // TODO(burdon): Update size.
    (cell, value) => {
      // TODO(burdon): Check only called if value changed.
      const object = cell.row.original;
      object[cell.column.id] = value;
      if (!object.id) {
        console.log(2, space, object);
        // TODO(burdon): Set __typename?
        // TODO(burdon): Silent invariant error if adding object directly (i.e., not Expando).
        space!.db.add(new Expando(Object.assign(object, { __type: table.schema.typename })));
      }
    },
    ({ id, type, header }) => {
      table.schema?.props.push({ id, type: getPropType(type), label: header });
    },
  );

  return (
    <Main.Content classNames={[fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <Grid<TypedObject> columns={columns} data={objects} />
    </Main.Content>
  );
};
