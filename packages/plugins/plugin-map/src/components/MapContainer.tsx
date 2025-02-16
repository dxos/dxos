//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useControlledValue } from '@dxos/react-ui';
import { type MapCanvasProps } from '@dxos/react-ui-geo';
import { StackItem } from '@dxos/react-ui-stack';

import { GlobeControl } from './Globe';
import { MapControl } from './Map';
import { useMarkers } from '../hooks';
import { type MapType } from '../types';

export type MapControlType = 'globe' | 'map';

export type MapContainerProps = { role?: string; type?: MapControlType; map?: MapType } & Pick<
  MapCanvasProps,
  'zoom' | 'center' | 'onChange'
>;

export const MapContainer = ({ role, type: _type = 'map', map, ...props }: MapContainerProps) => {
  const [type, setType] = useControlledValue(_type);
  const markers = useMarkers(map);

  return (
    <StackItem.Content toolbar={false} size={role === 'section' ? 'square' : 'intrinsic'}>
      {type === 'map' && <MapControl markers={markers} onToggle={() => setType('globe')} {...props} />}
      {type === 'globe' && <GlobeControl markers={markers} onToggle={() => setType('map')} {...props} />}
    </StackItem.Content>
  );
};

export default MapContainer;
