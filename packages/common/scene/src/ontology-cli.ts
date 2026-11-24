//
// Copyright 2026 DXOS.org
//

// Writes the ontology's JSON Schema document and its docs page: `moon run scene:gen-ontology`.

import { writeFileSync } from 'node:fs';

import { outputs } from './ontology-files.ts';

for (const { path, content } of outputs()) {
  writeFileSync(path, content);
  process.stdout.write(`${path}\n`);
}
