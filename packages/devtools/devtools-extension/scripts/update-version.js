//
// Copyright 2020 DXOS.org
//

const fs = require('fs');
const { join } = require('path');

const path = join(__dirname, '../src/manifest.json');

const json = JSON.parse(fs.readFileSync(path, { encoding: 'utf-8' }));

json.version = process.argv[2];

fs.writeFileSync(path, JSON.stringify(json, null, 2) + '\n', {
  encoding: 'utf-8'
});
