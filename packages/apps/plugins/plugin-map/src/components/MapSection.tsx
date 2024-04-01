//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';
import { MapContainer } from 'react-leaflet';

import { type MapType } from '@braneframe/types';

import { MapControl } from './MapControl';

// TODO(burdon): Query stack for objects with location.
const MapSection: FC<{ map: MapType }> = ({ map }) => {
  return (
    <div className='bs-96 mlb-2 overflow-auto'>
      <MapContainer className='flex-1 w-full h-full border-t border-neutral-200 dark:border-neutral-800 z-10'>
        <MapControl />
      </MapContainer>
    </div>
  );
};

export default MapSection;
