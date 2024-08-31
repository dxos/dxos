//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';
import { MapContainer } from 'react-leaflet';

import { MapControl } from './MapControl';
import { type MapType } from '../types';

// TODO(burdon): Query stack for objects with location.
const MapSection: FC<{ map: MapType }> = ({ map }) => {
  return (
    <div className='bs-96 mlb-2 overflow-auto'>
      <MapContainer className='z-10 h-full w-full flex-1 border-t border-neutral-200 dark:border-neutral-800'>
        <MapControl />
      </MapContainer>
    </div>
  );
};

export default MapSection;
