//
// Copyright 2025 DXOS.org
//

import { describe, it, expect } from 'vitest';

import { S } from '@dxos/echo-schema';

import { TypeNameSchema } from './schema-tool';

describe('TypeNameSchema format', () => {
  const valid = [
    'example.com/usCities',
    'dxos.org/Contact',
    'dxos.org/Table',
    'dxos.org/Table/Contact',
    'dxos.org/PluginName/TypeName',
    // Case variations
    'DXOS.org/Table',
    'dxos.ORG/table',
  ];

  const invalid = [
    'http://dxos.org/Table', // No protocol allowed
    'dxos.org/', // Must have type path
    // TODO(dmaretskyi): Decide if we want to ban numbers.
    // 'dxos.org/1Type', // Path segments must start with letter
    'dxos.org/Type!', // Invalid character
    '.org/Type', // Must have domain
  ];

  const validate = S.validateSync(TypeNameSchema);

  valid.forEach((typename) => {
    it(`should accept valid typename: ${typename}`, () => {
      expect(() => validate(typename)).not.toThrow();
    });
  });

  invalid.forEach((typename) => {
    it(`should reject invalid typename: ${typename}`, () => {
      expect(() => validate(typename)).toThrow();
    });
  });
});
