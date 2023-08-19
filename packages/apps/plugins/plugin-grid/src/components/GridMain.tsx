//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { SpacePluginProvides } from '@braneframe/plugin-space';
import { Main } from '@dxos/aurora';
import { baseSurface, mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/client';
import { TypedObject } from '@dxos/client/echo';
import { findPlugin, usePluginContext } from '@dxos/react-surface';

// TODO(burdon): Select type and generate columns from props.

export const GridMain: FC<{ data: TypedObject }> = ({ data: object }) => {
  const { plugins } = usePluginContext();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides?.space.current;

  return (
    <Main.Content classNames={mx('flex flex-col grow min-bs-[100vh] overflow-hidden', baseSurface)}>
      <pre className='m-4 p-2 ring'>
        <span>{space?.key.truncate()}</span>/<span>{PublicKey.from(object.id).truncate()}</span>
      </pre>
    </Main.Content>
  );
};
