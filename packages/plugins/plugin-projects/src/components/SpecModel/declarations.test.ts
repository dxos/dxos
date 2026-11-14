//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { specDeclarations } from './declarations.ts';

describe('specDeclarations', () => {
  test('reads a spec that names no dialects with the core and changelog blocks', ({ expect }) => {
    const declarations = specDeclarations('```mdl\nuses Lib\n```', []);
    expect(declarations.get('uses')?.role).toBe('context');
    expect(declarations.has('decision')).toBe(true);
  });
});
