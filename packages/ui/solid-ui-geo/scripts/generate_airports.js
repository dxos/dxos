#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

const JSONStream = require('JSONStream');
const fs = require('fs');
const path = require('path');

// https://github.com/algolia/datasets/tree/master/airports
const source = path.join(__dirname, '../data/raw/airports.json');
const filename = path.join(__dirname, '../data/airports.ts');

const features = [];

fs.createReadStream(source, { encoding: 'utf8' }).pipe(
  JSONStream.parse('.*')
    .on('data', (data) => {
      const {
        name,
        city,
        country,
        iata_code,
        _geoloc: { lat, lng },
      } = data;

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        properties: {
          iata: iata_code,
          name,
          city,
          country,
        },
      });
    })
    .on('end', () => {
      const collection = {
        type: 'FeatureCollection',
        features,
      };

      const generated = [
        '//',
        '// Copyright 2025 DXOS.org',
        `// Generated from ${path.basename(source)}`,
        '//',
        '',
        "import { FeatureCollection } from 'geojson';",
        '',
        `export default ${JSON.stringify(collection, null, 2)} satisfies FeatureCollection;`,
      ];

      fs.writeFileSync(filename, generated.join('\n'));

      // eslint-disable-next-line no-console
      console.log('Done:', filename);
    }),
);
