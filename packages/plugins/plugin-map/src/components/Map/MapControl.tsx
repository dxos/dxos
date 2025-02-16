//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Map, type MapController, useMapZoomHandler, type MapCanvasProps, type ControlProps } from '@dxos/react-ui-geo';

export type MapControlProps = MapCanvasProps & { onToggle: () => void };

export const MapControl = ({ classNames, markers, center, zoom, onToggle, onChange }: MapControlProps) => {
  const [controller, setController] = useState<MapController | null>(null);
  const handleZoomAction = useMapZoomHandler(controller);
  const handleAction: ControlProps['onAction'] = (action) => {
    switch (action) {
      case 'toggle': {
        onToggle();
        break;
      }
    }
  };

  return (
    <Map.Root classNames={classNames} center={center} zoom={zoom}>
      <Map.Canvas ref={setController} markers={markers} onChange={onChange} />
      <Map.Action onAction={handleAction} />
      <Map.Zoom onAction={handleZoomAction} />
    </Map.Root>
  );
};
