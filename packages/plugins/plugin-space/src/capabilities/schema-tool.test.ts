//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';

import { TypeNameSchema } from './schema-tools';

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

  const validate = Schema.validateSync(TypeNameSchema);

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
