//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Map, type MapCanvasProps } from './Map';

export type MapControlProps = MapCanvasProps & { onToggle: () => void };

export const MapControl = ({ classNames, markers, center, zoom, onToggle, onChange }: MapControlProps) => {
  return (
    <Map.Root classNames={classNames} center={center} zoom={zoom}>
      <Map.Canvas markers={markers} onChange={onChange} />
      <Map.ActionControls onAction={onToggle} />
      <Map.ZoomControls />
    </Map.Root>
  );
};
