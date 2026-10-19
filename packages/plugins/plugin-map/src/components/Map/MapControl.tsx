//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import {
  type ControlProps,
  Map,
  type MapController,
  type MapRootProps,
  type MapViewportProps,
  useMapZoomHandler,
} from '@dxos/react-ui-geo';
import * as Util from '@dxos/react-ui/Util';

import { type GeoControlProps } from '../types.ts';

/** The map never zooms out past one world width. */
export const MAP_MIN_ZOOM = 3;

export type MapControlProps = GeoControlProps & MapViewportProps & MapRootProps;

export const MapControl = Util.composable<HTMLDivElement, MapControlProps>(
  // Map.Root is headless and exposes the controller via ref, so MapControl has no DOM ref to forward.
  ({ center, zoom, markers, selected, onSelect, onToggle, onChange, tileUrl, lines, ...props }, _forwardedRef) => {
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
      <Map.Root onChange={onChange} ref={setController}>
        <Map.Viewport {...props} center={center} zoom={zoom} minZoom={MAP_MIN_ZOOM}>
          <Map.Tiles url={tileUrl} />
          <Map.Lines lines={lines} />
          <Map.Markers markers={markers} lines={lines} selected={selected} onSelect={onSelect} />
          {onToggle && <Map.Action onAction={handleAction} />}
          <Map.Zoom onAction={handleZoomAction} />
        </Map.Viewport>
      </Map.Root>
    );
  },
);
