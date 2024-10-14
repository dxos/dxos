#!/usr/bin/env node

//
// Copyright 2020 DXOS.org
//

const fs = require('fs');
const h3 = require('geojson2h3');
const path = require('path');

const resolutions = [3, 4];

/**
 * Convert hex multipolygon to centroid points.
 */
const hexagonsToPoints = (hex) => {
  const findCenter = (points) => {
    const [x, y] = points.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
    return [x / points.length, y / points.length];
  };

  // Convert to points.
  const points = hex.geometry.coordinates.map((hex) => {
    const coordinates = hex[0];
    return findCenter(coordinates);

    // TODO(burdon): Interesting effect with snapping and/or randomness lat/lng.
    // const round = (n, d) => Math.round(n * d) / d;
    // const ROUND_AMOUNT = 10;
    // Interesting effect with randomness.
    // const d = 1;
    // return { lat: center[1] + Math.random() / d, lng: center[0] + Math.random() / d };
    // return { lat: Math.floor(center[1]), lng: center[0] };
    // return { lat: center[1], lng: Math.floor(center[0]) };
    // return [round(center[1], ROUND_AMOUNT), round(center[0], ROUND_AMOUNT)];
  });

  return {
    type: 'GeometryCollection',
    geometries: [
      {
        type: 'MultiPoint',
        coordinates: points,
      },
    ],
  };
};

// https://gist.github.com/MichaelVerdegaal/a5f68cc0695ce4cf721cff4875696ffc
const source = path.join(__dirname, '../data/raw/countries.json');
const raw = fs.readFileSync(source, 'utf-8');
const data = JSON.parse(raw);

for (const resolution of resolutions) {
  const ts = Date.now();

  // https://h3geo.org/docs/api/regions
  const hexagons = h3.featureToH3Set(data, resolution);
  // TODO(burdon): Seems to have incorrect type (i.e., Not a well-formed MultiPolygon?)
  const feature = h3.h3SetToMultiPolygonFeature(hexagons);
  const points = hexagonsToPoints(feature);

  const generated = [
    '//',
    '// Copyright 2020 DXOS.org',
    `// Generated from ${path.basename(source)}`,
    '//',
    '',
    "import { GeometryCollection } from 'geojson';",
    '',
    `export default ${JSON.stringify(points, null, 2)} satisfies GeometryCollection;`,
  ];

  const filename = path.join(__dirname, `../data/countries-dots-${resolution}.ts`);
  fs.writeFileSync(filename, generated.join('\n'));

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ time: (Date.now() - ts) / 1000, raw: raw.length, hexagons: hexagons.length }, null, 2));
}
