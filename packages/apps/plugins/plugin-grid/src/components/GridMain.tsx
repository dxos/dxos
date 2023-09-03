//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { SpacePluginProvides } from '@braneframe/plugin-space';
import { Main } from '@dxos/aurora';
import { Grid, createColumnBuilder, defaultGridSlots } from '@dxos/aurora-grid';
import { coarseBlockPaddingStart } from '@dxos/aurora-theme';
import { TypedObject } from '@dxos/client/echo';
import { findPlugin, usePlugins } from '@dxos/react-surface';

// TODO(burdon): Select type and generate columns from props.

const { helper, builder } = createColumnBuilder<TypedObject>();
// prettier-ignore
const columns = [
  helper.accessor('id', { size: 100, cell: cell => <div className='font-mono text-green-500'>{cell.getValue().slice(0, 8)}</div> }),
  helper.accessor((item) => item.__typename, builder.createString({ id: 'type', className: 'font-mono text-green-500' })),
];

export const GridMain: FC<{ data: TypedObject }> = ({ data: object }) => {
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides?.space.active;
  const { objects = [] } = space?.db.query() ?? {};

  return (
    <Main.Content classNames={['flex flex-col min-bs-[calc(100dvh-2.5rem)] overflow-hidden', coarseBlockPaddingStart]}>
      <Grid<TypedObject> columns={columns} data={objects} slots={defaultGridSlots} />
    </Main.Content>
  );
};
