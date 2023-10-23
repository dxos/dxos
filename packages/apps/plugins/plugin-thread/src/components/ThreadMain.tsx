//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type SpacePluginProvides } from '@braneframe/plugin-space';
import { type Thread as ThreadType } from '@braneframe/types';
import { findPlugin, usePlugins } from '@dxos/app-framework';
import { Main } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

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
