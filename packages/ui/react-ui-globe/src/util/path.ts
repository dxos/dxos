//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import { type GeoGeometryObjects } from 'd3';
import { type Point, type Polygon, type Position } from 'geojson';

import type { Vector } from '../hooks';

export type LatLng = { lat: number; lng: number };

// TODO(burdon): Clean-up.

export const positionToRotation = ([lng, lat]: [number, number], tilt = 0): Vector => [-lng, tilt - lat, 0];

export const geoToPosition = ({ lat, lng }: LatLng): [number, number] => [lng, lat];

export const geoPoint = (point: LatLng): Point => ({ type: 'Point', coordinates: geoToPosition(point) });

// https://github.com/d3/d3-geo#geoCircle
export const geoCircle = ({ lat, lng }: LatLng, radius: number): Polygon =>
  d3.geoCircle().radius(radius).center([lng, lat])();

export const geoLine = (p1: LatLng, p2: LatLng): GeoGeometryObjects => ({
  type: 'LineString',
  coordinates: [
    [p1.lng, p1.lat],
    [p2.lng, p2.lat],
  ],
});

export const closestPoint = (points: Position[], target: Position): Position | null => {
  if (points.length === 0) {
    return target;
  }

  let closestPoint = points[0];
  let minDistance = getDistance(points[0], target);

  for (const point of points) {
    const distance = getDistance(point, target);
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = point;
    }
  }

  return closestPoint;
};

export const getDistance = (point1: Position, point2: Position): number => {
  const dx = point1[0] - point2[0];
  const dy = point1[1] - point2[1];
  return Math.sqrt(dx * dx + dy * dy);
};
