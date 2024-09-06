//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';

export type LatLng = { lat: number; lng: number };

// https://github.com/d3/d3-geo#geoCircle
export const geoCircle = ({ lat, lng }: LatLng, radius: number) => d3.geoCircle().center([lng, lat]).radius(radius);

export const line = (p1: LatLng, p2: LatLng) => ({
  type: 'LineString',
  coordinates: [
    [p1.lng, p1.lat],
    [p2.lng, p2.lat],
  ],
});
