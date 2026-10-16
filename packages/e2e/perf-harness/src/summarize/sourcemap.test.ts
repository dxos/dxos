//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { decodeMappings, packageOf } from './sourcemap.ts';

describe('source maps', () => {
  test('decodes segments with relative fields accumulated across a line and across lines', ({ expect }) => {
    // Line 1: column 0 → source 0, line 0, name 0; column 4 → source 0, line 1. Line 2: column 2 → source 0, line 2.
    expect(decodeMappings('AAAAA,IACA;EACA')).toEqual([
      [
        [0, 0, 0, 0],
        [4, 0, 1, -1],
      ],
      [[2, 0, 2, -1]],
    ]);
  });

  test('names the package a source belongs to', ({ expect }) => {
    expect(packageOf('packages/core/echo/echo-host/src/db-host/query-service.ts')).toBe('@dxos/echo-host');
    expect(packageOf('../../../ui/react-ui/src/List.tsx')).toBe('@dxos/react-ui');
    expect(packageOf('node_modules/.pnpm/@zag-js+core@1.0.0/node_modules/@zag-js/core/dist/index.mjs')).toBe(
      '@zag-js/core',
    );
    expect(packageOf('src/main.tsx')).toBe('(app)');
  });
});
