//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SpacePluginProvides } from '@braneframe/plugin-space';
import { findPlugin, usePlugins } from '@dxos/app-framework';
import { Main } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { Explorer } from './Explorer';

export const ExplorerMain = () => {
  // TODO(burdon): Get from node.
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides?.space.active;
  if (!space) {
    return null;
  }

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <Explorer space={space} />
    </Main.Content>
  );
};
