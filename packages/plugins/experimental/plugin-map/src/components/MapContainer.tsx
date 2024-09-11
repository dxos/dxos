//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useControlledValue } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { GlobeControl } from './GlobeControl';
import { MapControl } from './MapControl';
import { useMarkers } from '../hooks';
import { type MapType } from '../types';

export type MapControlType = 'globe' | 'map';

const MapContainer = ({ role, type: _type = 'globe', map }: { role?: string; type?: MapControlType; map: MapType }) => {
  const [type, setType] = useControlledValue(_type);
  const markers = useMarkers(map);
  return (
    <div role='none' className={mx('flex overflow-hidden', role === 'article' && 'row-span-2')}>
      {type === 'globe' && <GlobeControl markers={markers} onToggle={() => setType('map')} />}
      {type === 'map' && <MapControl markers={markers} onToggle={() => setType('map')} />}
    </div>
  );
};

export default MapContainer;
