//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';
import { MapContainer } from 'react-leaflet';

import { type SpacePluginProvides } from '@braneframe/plugin-space';
import { Main } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';
import { type TypedObject } from '@dxos/client/echo';
import { findPlugin, usePlugins } from '@dxos/react-surface';

import { MapControl } from './MapControl';

export const MapMain: FC<{ data: TypedObject }> = ({ data: object }) => {
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides?.space.active;
  if (!space) {
    return null;
  }

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <MapContainer className='flex-1 w-full h-screen border-t border-neutral-200 dark:border-neutral-800'>
        <MapControl />
      </MapContainer>
    </Main.Content>
  );
};
