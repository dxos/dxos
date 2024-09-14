#!/usr/bin/env node

//
// Copyright 2020 DXOS.org
//

const fs = require('fs');
const h3 = require('geojson2h3');
const path = require('path');

const resolutions = [1, 2, 3, 4];

// https://gist.github.com/MichaelVerdegaal/a5f68cc0695ce4cf721cff4875696ffc
const source = path.join(__dirname, '../data/raw/countries.json');

const raw = fs.readFileSync(source, 'utf-8');
const data = JSON.parse(raw);

for (const resolution of resolutions) {
  const ts = Date.now();

  // https://h3geo.org/docs/api/regions
  const hexagons = h3.featureToH3Set(data, resolution);
  // TODO(burdon): Seems to have incorrect type (i.e., Not a well-formed MultiPolygon)
  const result = h3.h3SetToMultiPolygonFeature(hexagons);

  const generated = [
    '//',
    '// Copyright 2020 DXOS.org',
    `// Generated from ${path.basename(source)}`,
    '//',
    '',
    "import { Feature } from 'geojson';",
    '',
    `export default ${JSON.stringify(result, null, 2)} satisfies Feature;`,
  ];

  const filename = path.join(__dirname, `../data/countries-hex-${resolution}.ts`);
  fs.writeFileSync(filename, generated.join('\n'));

  // eslint-disable-next-line no-console
  console.log(
    'done',
    JSON.stringify({ time: (Date.now() - ts) / 1000, raw: raw.length, hexagons: hexagons.length }, null, 2),
  );
}
