//
// Copyright 2019 DxOS.org
//

import * as d3 from 'd3';

/**
 * Utils.
 */
export class GeoUtil {

  static parseFeatures(data) {
    return data.features.map(feature => {
      const { properties: { name }, geometry: { coordinates } } = feature;
      return {
        name,
        lng: coordinates[0],
        lat: coordinates[1]
      };
    });
  }

  static collection = (geometries) => ({
    type: 'GeometryCollection',
    geometries
  });

  // https://github.com/d3/d3-geo#spherical-shapes
  // http://wiki.geojson.org/GeoJSON_draft_version_6#LineString
  static line = (p1, p2) => ({
    type: 'LineString',
    coordinates: [
      [p1.lng, p1.lat],
      [p2.lng, p2.lat]
    ]
  });

  // https://github.com/d3/d3-geo
  static circle = ({ lat, lng }, radius) => d3.geoCircle().center([lng, lat]).radius(radius)();
}
