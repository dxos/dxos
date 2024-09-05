//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';
import { MapContainer } from 'react-leaflet';

import { MapControl } from './MapControl';
import useMapDetectLocations from './MapDetectLocations';
import { type MapType } from '../types';

const MapSection: FC<{ map: MapType }> = ({ map }) => {
  const markers = useMapDetectLocations(map);

  return (
    <div className='bs-96 mlb-2 overflow-auto'>
      <MapContainer className='flex-1 w-full h-full border-t border-neutral-200 dark:border-neutral-800 z-10'>
        <MapControl markers={markers} />
      </MapContainer>
    </div>
  );
};

export default MapSection;
