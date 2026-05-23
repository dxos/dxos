//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { composable } from '@dxos/react-ui';
import {
  type ControlProps,
  Map,
  type MapContentProps,
  type MapController,
  type MapRootProps,
  useMapZoomHandler,
} from '@dxos/react-ui-geo';

import { type GeoControlProps } from '../types';

export type MapControlProps = GeoControlProps & MapContentProps & MapRootProps;

export const MapControl = composable<HTMLDivElement, MapControlProps>(
  ({ center, zoom, markers, selected, onToggle, onChange, ...props }, forwardedRef) => {
    const [controller, setController] = useState<MapController | null>(null);
    const handleZoomAction = useMapZoomHandler(controller);

    const handleAction = useCallback<NonNullable<ControlProps['onAction']>>(
      (action) => {
        switch (action) {
          case 'toggle': {
            // Emit the live position so the next control inherits the user's current view.
            const center = controller?.getCenter();
            const zoom = controller?.getZoom();
            if (center && typeof zoom === 'number') {
              onChange?.({ center, zoom });
            }
            onToggle?.();
            break;
          }
        }
      },
      [controller, onChange, onToggle],
    );

    return (
      <Map.Root {...props} onChange={onChange} ref={forwardedRef}>
        <Map.Content ref={setController} center={center} zoom={zoom}>
          <Map.Tiles />
          <Map.Markers markers={markers} selected={selected} />
          {onToggle && <Map.Action onAction={handleAction} />}
          <Map.Zoom onAction={handleZoomAction} />
        </Map.Content>
      </Map.Root>
    );
  },
);
