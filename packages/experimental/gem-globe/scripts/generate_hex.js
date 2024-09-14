//
// Copyright 2020 DXOS.org
//

const fs = require('fs');
const h3 = require('geojson2h3');
const path = require('path');

//
// node --max-old-space-size=8096 ./scripts/generate_hex.js
//

const resolutions = [1, 2, 3, 4, 5];

// https://gist.github.com/MichaelVerdegaal/a5f68cc0695ce4cf721cff4875696ffc
const source = path.join(__dirname, '../data/raw/countries.json');

const raw = fs.readFileSync(source, 'utf-8');
const data = JSON.parse(raw);

for (const resolution of resolutions) {
  const ts = Date.now();
  const hexagons = h3.featureToH3Set(data, resolution);
  const result = h3.h3SetToMultiPolygonFeature(hexagons);

  const filename = path.join(__dirname, `../data/countries-hex-${resolution}.js`);
  fs.writeFileSync(filename, 'export default ' + JSON.stringify(result, null, 2));

  console.log(
    'done',
    JSON.stringify({ time: (Date.now() - ts) / 1000, raw: raw.length, hexagons: hexagons.length }, null, 2),
  );
}
