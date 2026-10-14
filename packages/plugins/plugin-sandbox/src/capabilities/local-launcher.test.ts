//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseReadyLine } from './local-launcher.ts';

describe('parseReadyLine', () => {
  test('reads the port with or without the line terminator', ({ expect }) => {
    expect(parseReadyLine('{"port":39803}\n')).toBe(39803);
    expect(parseReadyLine('{"port":39803}')).toBe(39803);
  });

  test('rejects anything else', ({ expect }) => {
    expect(() => parseReadyLine('listening\n')).toThrow('unexpected first line from dx-sandbox: listening');
    expect(() => parseReadyLine('{"port":"1"}')).toThrow(/unexpected first line/);
  });
});
