//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';
import { MapContainer } from 'react-leaflet';

import { type MapType } from '@braneframe/types';

import { MapControl } from './MapControl';
import useMapDetectLocations from './MapDetectLocations';

const MapArticle: FC<{ map: MapType }> = ({ map }) => {
  const markers = useMapDetectLocations(map);

  return (
    <MapContainer className='row-span-2 overflow-auto'>
      <MapControl markers={markers} />
    </MapContainer>
  );
};

export default MapArticle;
