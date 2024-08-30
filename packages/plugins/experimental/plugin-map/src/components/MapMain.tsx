//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';
import { MapContainer } from 'react-leaflet';

import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  topbarBlockPaddingStart,
  fixedInsetFlexLayout,
  bottombarBlockPaddingEnd,
} from '@dxos/react-ui-theme';

import { MapControl } from './MapControl';
import { type MapType } from '../types';

const MapMain: FC<{ map: MapType }> = ({ map }) => {
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <MapContainer className='flex-1 w-full h-full border-t border-neutral-200 dark:border-neutral-800'>
        <MapControl />
      </MapContainer>
    </Main.Content>
  );
};

export default MapMain;
