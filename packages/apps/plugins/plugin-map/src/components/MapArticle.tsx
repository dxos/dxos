//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';
import { MapContainer } from 'react-leaflet';

import { type MapType } from '@braneframe/types';

import { MapControl } from './MapControl';

// TODO(burdon): Query stack for objects with location.
const MapArticle: FC<{ map: MapType }> = ({ map }) => {
  return (
    <MapContainer className='is-full overflow-auto row-span-2'>
      <MapControl />
    </MapContainer>
  );
};

export default MapArticle;
