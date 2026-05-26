#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://github.com/topojson/world-atlas
// https://www.naturalearthdata.com/downloads
const resolutions = ['110m', '50m', '10m'];

for (const resolution of resolutions) {
  const source = path.join(__dirname, `../data/raw/countries-${resolution}.json`);
  const filename = path.join(__dirname, `../data/countries-${resolution}.ts`);

  if (!fs.existsSync(source)) {
    // eslint-disable-next-line no-console
    console.warn('Missing:', source);
    continue;
  }

  const topology = JSON.parse(fs.readFileSync(source, 'utf8'));

  // Embed the topology as a JSON string + runtime `JSON.parse`. TypeScript
  // then sees only a string literal (no deep object-literal inference), which
  // matters because the 10m / 50m files are large enough that TSC otherwise
  // times out validating the structure against `Topology`. V8 also parses
  // JSON faster than equivalent JS object literals at runtime.
  const json = JSON.stringify(topology).replace(/'/g, "\\'");
  const source_code = [
    '//',
    '// Copyright 2026 DXOS.org',
    `// Generated from ${path.basename(source)}`,
    '//',
    '',
    "import { type Topology } from 'topojson-specification';",
    '',
    '/**',
    ' * https://github.com/topojson/world-atlas',
    ' * https://www.naturalearthdata.com/downloads',
    ' */',
    `export default JSON.parse('${json}') as Topology;`,
    '',
  ].join('\n');

  // eslint-disable-next-line no-console
  console.log('Generating:', path.basename(filename));
  fs.writeFileSync(filename, source_code);

  // eslint-disable-next-line no-console
  console.log('Generated:', filename);
}
