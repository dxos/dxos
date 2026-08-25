//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DXPLUGIN_SCHEMA_FILENAME, descriptorJsonSchema } from './plugin-schema';

describe('dxplugin.schema.json', () => {
  test('matches the runtime descriptor schema', ({ expect }) => {
    // The checked-in copy exists for editors to resolve, so nothing else stops it drifting.
    const checkedIn = readFileSync(join(__dirname, '../..', DXPLUGIN_SCHEMA_FILENAME), 'utf-8');
    expect(JSON.parse(checkedIn)).toEqual(descriptorJsonSchema());
  });

  test('describes the fields a descriptor is authored with', ({ expect }) => {
    const schema = descriptorJsonSchema();
    expect(schema).toMatchObject({ $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object' });
    expect(Object.keys((schema as { properties: object }).properties)).toContain('modules');
    expect(schema).toMatchObject({ required: expect.arrayContaining(['key', 'name', 'modules']) });
  });
});
