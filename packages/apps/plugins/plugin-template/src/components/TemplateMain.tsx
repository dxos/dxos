//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SpacePluginProvides } from '@braneframe/plugin-space';
import { Main } from '@dxos/aurora';
import { baseSurface, mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/client';
import { TypedObject } from '@dxos/client/echo';
import { findPlugin, usePluginContext } from '@dxos/react-surface';

export const TemplateMain = ({ data: object }: { data: TypedObject }) => {
  const { plugins } = usePluginContext();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides?.space.current;

  return (
    // TODO(burdon): Boilerplate.
    <Main.Content classNames={mx('flex flex-col grow min-bs-[100vh] overflow-hidden', baseSurface)}>
      <pre className='m-4 p-2 ring'>
        <span>{space?.key.truncate()}</span>/<span>{PublicKey.from(object.id).truncate()}</span>
      </pre>
    </Main.Content>
  );
};
