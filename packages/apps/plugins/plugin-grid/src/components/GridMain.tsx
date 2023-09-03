//
// Copyright 2023 DXOS.org
//

import React, { FC, useEffect, useState } from 'react';

import { SpacePluginProvides } from '@braneframe/plugin-space';
import { Main } from '@dxos/aurora';
import { Grid, createColumnBuilder, GridColumnDef } from '@dxos/aurora-grid';
import { coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';
import { TypedObject } from '@dxos/client/echo';
import { findPlugin, usePlugins } from '@dxos/react-surface';

// TODO(burdon): Select type and generate columns from props.

const { helper, builder } = createColumnBuilder<TypedObject>();
const columns: GridColumnDef<TypedObject, any>[] = [
  helper.accessor('id', {
    size: 80,
    cell: (cell) => <div className='font-mono text-sm text-green-500'>{cell.getValue().slice(0, 8)}</div>,
  }),
  helper.accessor((item) => item.__typename, {
    id: 'type',
    size: 300,
    ...builder.string({ className: 'font-mono text-sm text-cyan-500' }),
  }),
  helper.accessor('title', {}),
  helper.accessor((item) => !item.__deleted, { id: 'deleted', header: '', ...builder.icon() }),
];

export const GridMain: FC<{ data: TypedObject }> = ({ data: object }) => {
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides?.space.active;
  const subscription = space?.db.query({}); // TODO(burdon): Show deleted.
  const [objects, setObjects] = useState<TypedObject[]>(subscription?.objects ?? []);
  useEffect(() => {
    setObjects(subscription?.objects ?? []);
    return subscription?.subscribe(({ objects }) => {
      setObjects(objects);
    });
  }, [subscription]);

  // TODO(burdon): aurora-grid styles aren't processed.

  return (
    <Main.Content classNames={[fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <Grid<TypedObject> columns={columns} data={objects} select='single' />
    </Main.Content>
  );
};
