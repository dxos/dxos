//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type SpacePluginProvides } from '@braneframe/plugin-space';
import { findPlugin, usePlugins } from '@dxos/app-framework';
import { PublicKey } from '@dxos/client';
import { type TypedObject } from '@dxos/client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

export const TemplateMain: FC<{ data: TypedObject }> = ({ data: object }) => {
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides?.space.active;

  return (
    // TODO(burdon): Boilerplate.
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <pre className='m-4 p-2 ring'>
        <span>{space?.key.truncate()}</span>/<span>{PublicKey.from(object.id).truncate()}</span>
      </pre>
    </Main.Content>
  );
};
