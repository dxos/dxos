//
// Copyright 2024 DXOS.org
//

import { type LatLngLiteral } from 'leaflet';

export type MapMarker = {
  id: string;
  title?: string;
  location: LatLngLiteral;
};
