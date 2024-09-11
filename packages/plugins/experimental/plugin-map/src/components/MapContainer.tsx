//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { mx } from '@dxos/react-ui-theme';

import { GlobeControl } from './GlobeControl';
import { MapControl } from './MapControl';
import { useMarkers } from '../hooks';
import { type MapType } from '../types';

type MapControlType = 'globe' | 'map';

const MapContainer = ({ role, map }: { role?: string; map: MapType }) => {
  const [type, setType] = useState<MapControlType>('globe');
  const markers = useMarkers(map);
  return (
    <div role='none' className={mx('flex', role === 'article' && 'row-span-2')}>
      {type === 'globe' && <GlobeControl markers={markers} onToggle={() => setType('map')} />}
      {type === 'map' && <MapControl markers={markers} onToggle={() => setType('map')} />}
    </div>
  );
};

export default MapContainer;
