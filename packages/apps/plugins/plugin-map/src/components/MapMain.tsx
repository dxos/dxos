//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';
import { MapContainer } from 'react-leaflet';

import { type TypedObject } from '@dxos/client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { MapControl } from './MapControl';

export const MapMain: FC<{ map: TypedObject }> = ({ map }) => {
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <MapContainer className='flex-1 w-full h-screen border-t border-neutral-200 dark:border-neutral-800'>
        <MapControl />
      </MapContainer>
    </Main.Content>
  );
};
