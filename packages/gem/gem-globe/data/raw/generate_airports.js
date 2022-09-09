//
// Copyright 2019 DXOS.org
//

const fs = require('fs');
const JSONStream = require('JSONStream');

// https://github.com/algolia/datasets/tree/master/airports

const INPUT = './world_airports.json';

const OUTPUT = '../airports.json';

// GeoJSON
const map = {
  type: 'FeatureCollection',
  features: []
};

let total = 0;

fs.createReadStream(INPUT, { encoding: 'utf8' })
  .pipe(JSONStream.parse('.*')
    .on('data', data => {
      const { name, city, country, iata_code, _geoloc: { lat, lng } } = data;

      const record = {
        properties: {
          iata: iata_code,
          name,
          city,
          country
        },
        geometry: {
          type: 'Point',
          coordinates: [ lng, lat ]
        }
      };

      console.log(JSON.stringify(record));
      map.features.push(record);

      total++;
    })
    .on('end', () => {
      fs.writeFileSync(OUTPUT, JSON.stringify(map, null, 2));
      console.log('Done:', OUTPUT, map.features.length, '/', total);
    }));
