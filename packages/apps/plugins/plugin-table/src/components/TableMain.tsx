//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { SpacePluginProvides } from '@braneframe/plugin-space';
import { Table as TableType, Schema as SchemaType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { Grid } from '@dxos/aurora-grid';
import { coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';
import { TypedObject } from '@dxos/client/echo';
import { findPlugin, usePlugins } from '@dxos/react-surface';

export const TableMain: FC<{ data: TableType }> = ({ data: object }) => {
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides?.space.active;
  const subscription = space?.db.query(SchemaType.filter()); // TODO(burdon): Show deleted.
  // const [objects, setObjects] = useState<TypedObject[]>(subscription?.objects ?? []);
  // useEffect(() => {
  //   setObjects(subscription?.objects ?? []);
  //   return subscription?.subscribe(({ objects }) => {
  //     setObjects(objects);
  //   });
  // }, [subscription]);

  // TODO(burdon): Runaway.
  // console.log(subscription?.objects.length);

  return (
    <Main.Content classNames={[fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <Grid<TypedObject> columns={[]} data={[]} select='single' />
    </Main.Content>
  );
};
