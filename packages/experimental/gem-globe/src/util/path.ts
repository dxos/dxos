//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import { type GeoCircleGenerator, type GeoGeometryObjects } from 'd3';

export type LatLng = { lat: number; lng: number };

export const latLngToRotation = (point: LatLng): [number, number, number] => {
  return [-point.lng, -point.lat, 0];
};

export const geoPoint = ({ lat, lng }: LatLng) => ({ type: 'Point', coordinates: [lng, lat] });

// https://github.com/d3/d3-geo#geoCircle
export const geoCircle = ({ lat, lng }: LatLng, radius: number): GeoCircleGenerator =>
  d3.geoCircle().radius(radius).center([lng, lat]);

export const geoLine = (p1: LatLng, p2: LatLng): GeoGeometryObjects => ({
  type: 'LineString',
  coordinates: [
    [p1.lng, p1.lat],
    [p2.lng, p2.lat],
  ],
});
