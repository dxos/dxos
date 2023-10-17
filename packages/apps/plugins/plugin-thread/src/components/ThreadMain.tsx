//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type SpacePluginProvides } from '@braneframe/plugin-space';
import { type Thread as ThreadType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';
import { findPlugin, usePlugins } from '@dxos/react-surface';

import { ThreadContainer } from './ThreadContainer';

export const ThreadMain: FC<{ data: ThreadType }> = ({ data: object }) => {
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides.space.active;
  if (!space) {
    return null;
  }

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <ThreadContainer space={space} thread={object} />
    </Main.Content>
  );
};
