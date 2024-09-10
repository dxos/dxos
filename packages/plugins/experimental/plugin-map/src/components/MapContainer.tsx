//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { GlobeControl } from './GlobeControl';
import { MapControl } from './MapControl';
import { useMarkers } from '../hooks';
import { type MapType } from '../types';

type MapControlType = 'globe' | 'map';

const MapContainer = ({ map }: { map: MapType }) => {
  const [type, setType] = useState<MapControlType>('globe');
  const markers = useMarkers(map);
  const classNames = 'row-span-2 overflow-auto border-t border-separator';
  return (
    <div className='bs-96 mlb-2 overflow-auto'>
      {type === 'globe' && <GlobeControl classNames={classNames} markers={markers} onToggle={() => setType('map')} />}
      {type === 'map' && <MapControl classNames={classNames} markers={markers} onToggle={() => setType('map')} />}
    </div>
  );
};

export default MapContainer;
