//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';
import { MapContainer } from 'react-leaflet';

import { type TypedObject } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { MapControl } from './MapControl';

export const MapMain: FC<{ map: TypedObject }> = ({ map }) => {
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <MapContainer className='flex-1 w-full h-full border-t border-neutral-200 dark:border-neutral-800'>
        <MapControl />
      </MapContainer>
    </Main.Content>
  );
};

// TODO(burdon): Query stack for objects with location.
export const MapSection: FC<{ map: TypedObject }> = ({ map }) => {
  return (
    <div className='bs-96 mlb-2 overflow-auto'>
      <MapContainer className='flex-1 w-full h-full border-t border-neutral-200 dark:border-neutral-800 z-10'>
        <MapControl />
      </MapContainer>
    </div>
  );
};
