//
// Copyright 2024 DXOS.org
//

import { type LatLngLiteral } from 'leaflet';

import { type ThemedClassName } from '@dxos/react-ui';

import { type MapMarker } from '../types';

export type { LatLngLiteral };

export type MapCanvasProps = ThemedClassName<{
  markers?: MapMarker[];
  zoom?: number;
  center?: LatLngLiteral;
  onChange?: (ev: { center: LatLngLiteral; zoom: number }) => void;
}>;
