//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Map } from './Map';
import { useMarkers } from '../hooks';
import { type MapType } from '../types';

const MapSection: FC<{ map: MapType }> = ({ map }) => {
  const markers = useMarkers(map);
  return (
    <div className='bs-96 mlb-2 overflow-auto'>
      <Map.Root classNames='border-t border-separator'>
        <Map.Canvas markers={markers} />
        <Map.ActionControls />
        <Map.ZoomControls />
      </Map.Root>
    </div>
  );
};

export default MapSection;
