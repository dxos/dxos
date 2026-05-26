#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://github.com/topojson/world-atlas
// https://www.naturalearthdata.com/downloads
const resolutions = ['110m', '50m', '10m'];

const prettierConfig = (await prettier.resolveConfig(__dirname)) ?? {};

for (const resolution of resolutions) {
  const source = path.join(__dirname, `../data/raw/countries-${resolution}.json`);
  const filename = path.join(__dirname, `../data/countries-${resolution}.ts`);

  if (!fs.existsSync(source)) {
    // eslint-disable-next-line no-console
    console.warn('Missing:', source);
    continue;
  }

  const topology = JSON.parse(fs.readFileSync(source, 'utf8'));

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
    `export default ${JSON.stringify(topology)} satisfies Topology;`,
    '',
  ].join('\n');

  // eslint-disable-next-line no-console
  console.log('Formatting:', path.basename(filename));
  const formatted = await prettier.format(source_code, { ...prettierConfig, parser: 'typescript' });
  fs.writeFileSync(filename, formatted);

  // eslint-disable-next-line no-console
  console.log('Generated:', filename);
}
