//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';
import { MapContainer } from 'react-leaflet';

import { MapControl } from './MapControl';
import { type MapType } from '../types';

// TODO(burdon): Query stack for objects with location.
const MapArticle: FC<{ map: MapType }> = ({ map }) => {
  return (
    <MapContainer className='row-span-2 overflow-auto'>
      <MapControl />
    </MapContainer>
  );
};

export default MapArticle;
