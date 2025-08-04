//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { type ControlProps, Map, type MapCanvasProps, type MapController, useMapZoomHandler } from '@dxos/react-ui-geo';

export type MapControlProps = MapCanvasProps & { onToggle?: () => void };

export const MapControl = ({ classNames, markers, center, zoom, onToggle, onChange }: MapControlProps) => {
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
    <Map.Root classNames={classNames} center={center} zoom={zoom}>
      <Map.Canvas ref={setController} markers={markers} onChange={onChange} />
      {onToggle && <Map.Action onAction={handleAction} />}
      <Map.Zoom onAction={handleZoomAction} />
    </Map.Root>
  );
};
