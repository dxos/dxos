//
// Copyright 2025 DXOS.org
//

import { type LatLngLiteral } from 'leaflet';

export { type LatLngLiteral };

export type GeoMarker = {
  id: string;
  title?: string;
  location: LatLngLiteral;
};
