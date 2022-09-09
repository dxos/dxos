//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';

// https://github.com/d3/d3-geo#geoCircle
export const geoCircle = ({ lat, lng }, radius) => d3.geoCircle()
  .center([lng, lat])
  .radius(radius);

export const line = (p1, p2) => ({
  type: 'LineString',
  coordinates: [
    [p1.lng, p1.lat],
    [p2.lng, p2.lat]
  ]
});
