//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useCallback, useState } from 'react';

import { ComposableProps } from '@dxos/react-ui';
import {
  type ControlProps,
  Map,
  type MapContentProps,
  type MapController,
  type MapRootProps,
  useMapZoomHandler,
} from '@dxos/react-ui-geo';

import { type GeoControlProps } from '../types';

export type MapControlProps = ComposableProps<HTMLDivElement, GeoControlProps & MapContentProps & MapRootProps>;

export const MapControl = forwardRef<HTMLDivElement, MapControlProps>(
  ({ center, zoom, markers, selected, onToggle, onChange, ...props }, forwardedRef) => {
    const [controller, setController] = useState<MapController | null>(null);
    const handleZoomAction = useMapZoomHandler(controller);

    const handleAction = useCallback<NonNullable<ControlProps['onAction']>>((action) => {
      switch (action) {
        case 'toggle': {
          onToggle?.();
          break;
        }
      }
    }, []);

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
