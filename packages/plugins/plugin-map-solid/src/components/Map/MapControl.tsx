//
// Copyright 2025 DXOS.org
//

import { createMemo, createSignal } from 'solid-js';

import { type ControlProps, type LatLngLiteral, Map, type MapController, useMapZoomHandler } from '@dxos/solid-ui-geo';

import { type GeoControlProps } from '../types';

export type MapControlProps = GeoControlProps & {
  onChange?: (ev: { center: LatLngLiteral; zoom: number }) => void;
};

export const MapControl = (props: MapControlProps) => {
  const [controller, setController] = createSignal<MapController | null>(null);
  const handleZoomAction = createMemo(() => useMapZoomHandler(controller()));

  const handleAction: ControlProps['onAction'] = (action) => {
    switch (action) {
      case 'toggle': {
        props.onToggle?.();
        break;
      }
    }
  };

  return (
    <Map.Root ref={setController} center={props.center} zoom={props.zoom} onChange={props.onChange}>
      <Map.Tiles />
      <Map.Markers markers={props.markers} />
      {props.onToggle && <Map.Action onAction={handleAction} />}
      <Map.Zoom onAction={handleZoomAction()} />
    </Map.Root>
  );
};
