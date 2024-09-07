//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';
import { MapContainer } from 'react-leaflet';

import { MapControl } from './MapControl';
import { useMarkers } from '../hooks';
import { type MapType } from '../types';

const MapArticle: FC<{ map: MapType }> = ({ map }) => {
  const markers = useMarkers(map);

  return (
    <MapContainer className='row-span-2 overflow-auto'>
      <MapControl markers={markers} />
    </MapContainer>
  );
};

export default MapArticle;
