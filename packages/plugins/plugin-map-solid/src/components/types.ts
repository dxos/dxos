//
// Copyright 2025 DXOS.org
//

import { type Accessor } from 'solid-js';

import { type GeoMarker, type LatLngLiteral, type MapMarkersProps } from '@dxos/solid-ui-geo';

export type GeoControlProps = {
  center?: LatLngLiteral;
  zoom?: number;
  onToggle?: () => void;
} & Pick<MapMarkersProps, 'markers'>;

