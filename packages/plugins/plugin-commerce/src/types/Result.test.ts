//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Result from './Result';

describe('Result type', () => {
  test('make + instanceOf', ({ expect }) => {
    const result = Result.make({ title: 'Porsche 911', url: 'https://x/1', images: [], properties: {} });
    expect(Result.instanceOf(result)).toBe(true);
    expect(result.title).toEqual('Porsche 911');
    expect(result.images).toEqual([]);
  });
});
