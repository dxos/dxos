//
// Copyright 2024 DXOS.org
//

import { type LatLngLiteral } from 'leaflet';

import { type ThemedClassName } from '@dxos/react-ui';

import { type GeoMarker } from '../types';

export { type LatLngLiteral };

export type MapCanvasProps = ThemedClassName<{
  markers?: GeoMarker[];
  selected?: string[];
  center?: LatLngLiteral;
  zoom?: number;
  onChange?: (params: { center: LatLngLiteral; zoom: number }) => void;
}>;
