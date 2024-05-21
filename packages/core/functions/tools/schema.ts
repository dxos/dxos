//
// Copyright 2024 DXOS.org
//

import { writeFileSync } from 'fs';
import path from 'path';

import { effectToJsonSchema } from '@dxos/echo-schema';

import { FunctionManifestSchema } from '../src';

/**
 * npx ts-node ./tools/schema.ts
 */
const generate = (filepath: string) => {
  const schema = JSON.stringify(effectToJsonSchema(FunctionManifestSchema), undefined, 2);
  writeFileSync(filepath, schema, 'utf8');
};

generate(path.join(__dirname, '../schema/functions.json'));
