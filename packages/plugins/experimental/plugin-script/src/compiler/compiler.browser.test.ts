//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Compiler } from './compiler';

describe('Compiler', () => {
  test('Basic', async () => {
    const compiler = new Compiler();
    await compiler.initialize();
    compiler.setFile('/src/x.ts', 'export const x = 100');
    compiler.setFile('/src/y.ts', 'import { x } from "./x"; export const y = x + 100;');
    const result = await compiler.compile('/src/y.ts');
    expect(result).to.exist;
  });
});
