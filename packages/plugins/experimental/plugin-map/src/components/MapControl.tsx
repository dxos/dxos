//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Map, type MapCanvasProps } from './Map';

export type MapControlProps = MapCanvasProps & { onToggle: () => void };

export const MapControl = ({ classNames, markers, onToggle }: MapControlProps) => {
  return (
    <Map.Root classNames={classNames}>
      <Map.Canvas markers={markers} />
      <Map.ActionControls onAction={onToggle} />
      <Map.ZoomControls />
    </Map.Root>
  );
};
