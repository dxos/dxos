//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SpacePluginProvides } from '@braneframe/plugin-space';
import { type View as ViewType } from '@braneframe/types';
import { findPlugin, usePlugins } from '@dxos/react-surface';
import { type PluginComponentProps } from '@dxos/react-surface';
import { Main } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { Explorer } from './Explorer';

export const ExplorerMain = ({ data }: PluginComponentProps<ViewType>) => {
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
