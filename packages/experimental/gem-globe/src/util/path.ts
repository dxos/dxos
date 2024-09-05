//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';

// https://github.com/d3/d3-geo#geoCircle
export const geoCircle = ({ lat, lng }: any, radius: number) => d3.geoCircle()
  .center([lng, lat])
  .radius(radius);

export const line = (p1: any, p2: any) => ({
  type: 'LineString',
  coordinates: [
    [p1.lng, p1.lat],
    [p2.lng, p2.lat]
  ]
});
