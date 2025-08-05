//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { type ControlProps, Map, type MapController, type MapRootProps, useMapZoomHandler } from '@dxos/react-ui-geo';

import { type GeoControlProps } from '../types';

export type MapControlProps = GeoControlProps & MapRootProps;

export const MapControl = ({ classNames, center, zoom, markers, selected, onToggle, onChange }: MapControlProps) => {
  const [controller, setController] = useState<MapController | null>(null);
  const handleZoomAction = useMapZoomHandler(controller);

  const handleAction: ControlProps['onAction'] = (action) => {
    switch (action) {
      case 'toggle': {
        onToggle?.();
        break;
      }
    }
  };

  return (
    <Map.Root ref={setController} classNames={classNames} center={center} zoom={zoom} onChange={onChange}>
      <Map.Tiles />
      <Map.Markers markers={markers} selected={selected} />
      {onToggle && <Map.Action onAction={handleAction} />}
      <Map.Zoom onAction={handleZoomAction} />
    </Map.Root>
  );
};
