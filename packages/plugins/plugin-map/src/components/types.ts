//
// Copyright 2025 DXOS.org
//

import { type LatLngLiteral, type MapMarkersProps } from '@dxos/react-ui-geo';

export type GeoControlProps = {
  center?: LatLngLiteral;
  zoom?: number;
  onToggle?: () => void;
} & MapMarkersProps;
