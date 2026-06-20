//
// Copyright 2025 DXOS.org
//

import { type LatLngLiteral, type MapMarkersProps } from '@dxos/react-ui-geo';

/** Origin → destination arc (rendered as a great-circle line on the globe). `color` is an optional stroke color. */
export type GeoLine = { source: LatLngLiteral; target: LatLngLiteral; color?: string };

export type GeoControlProps = {
  center?: LatLngLiteral;
  zoom?: number;
  onToggle?: () => void;
  /** Leaflet tile URL template (map variant); defaults to OpenStreetMap. */
  tileUrl?: string;
  /** Great-circle arcs between points (globe variant). */
  lines?: GeoLine[];
} & MapMarkersProps;
