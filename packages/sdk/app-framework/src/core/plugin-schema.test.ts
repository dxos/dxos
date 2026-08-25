//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DXPLUGIN_SCHEMA_FILENAME, descriptorJsonSchema } from './plugin-schema';

describe('dxplugin.schema.json', () => {
  it('matches the runtime descriptor schema', () => {
    // The checked-in file exists so editors can resolve a plain file; this is what stops it drifting
    // from `Config2.Descriptor`. Regenerate with `scripts/generate-dxplugin-schema.ts`.
    const checkedIn = readFileSync(join(__dirname, '../..', DXPLUGIN_SCHEMA_FILENAME), 'utf-8');
    expect(JSON.parse(checkedIn)).toEqual(descriptorJsonSchema());
  });

  it('describes the fields a descriptor is authored with', () => {
    const schema = descriptorJsonSchema();
    expect(schema).toMatchObject({ $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object' });
    expect(Object.keys((schema as { properties: object }).properties)).toContain('modules');
    expect(schema).toMatchObject({ required: expect.arrayContaining(['key', 'name', 'modules']) });
  });
});
