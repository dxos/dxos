//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { SpacePluginProvides } from '@braneframe/plugin-space';
import { Main } from '@dxos/aurora';
import { coarseBlockPaddingStart } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/client';
import { TypedObject } from '@dxos/client/echo';
import { findPlugin, usePlugins } from '@dxos/react-surface';

export const TemplateMain: FC<{ data: TypedObject }> = ({ data: object }) => {
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides?.space.current;

  return (
    // TODO(burdon): Boilerplate.
    <Main.Content classNames={coarseBlockPaddingStart}>
      <pre className='m-4 p-2 ring'>
        <span>{space?.key.truncate()}</span>/<span>{PublicKey.from(object.id).truncate()}</span>
      </pre>
    </Main.Content>
  );
};
