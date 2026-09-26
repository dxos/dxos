//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { gzip } from './compress.ts';

describe('gzip', () => {
  test('round-trips through DecompressionStream', async ({ expect }) => {
    const text = '{"m":"hello"}\n'.repeat(1_000);
    const compressed = await gzip(text);
    expect(compressed.type).toBe('application/gzip');
    expect(compressed.size).toBeLessThan(text.length);
    const decompressed = await new Response(compressed.stream().pipeThrough(new DecompressionStream('gzip'))).text();
    expect(decompressed).toBe(text);
  });
});
