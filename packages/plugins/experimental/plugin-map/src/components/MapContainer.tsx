//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useControlledValue } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { GlobeControl } from './GlobeControl';
import { type MapCanvasProps } from './Map';
import { MapControl } from './MapControl';
import { useMarkers } from '../hooks';
import { type MapType } from '../types';

export type MapControlType = 'globe' | 'map';

export type MapContainerProps = { role?: string; type?: MapControlType; map: MapType } & Pick<
  MapCanvasProps,
  'onChange'
>;

const MapContainer = ({ role, type: _type = 'map', map, ...props }: MapContainerProps) => {
  const [type, setType] = useControlledValue(_type);
  const markers = useMarkers(map);
  console.log(type, markers.length);
  return (
    <div role='none' className={mx('flex overflow-hidden', role === 'article' && 'row-span-2')}>
      {type === 'map' && <MapControl markers={markers} onToggle={() => setType('globe')} {...props} />}
      {type === 'globe' && <GlobeControl markers={markers} onToggle={() => setType('map')} {...props} />}
    </div>
  );
};

export default MapContainer;
