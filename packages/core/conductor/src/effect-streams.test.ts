//
// Copyright 2025 DXOS.org
//

import { Effect, Stream } from 'effect';
import { describe, test } from 'vitest';

import { isStream } from './schema-dsl/stream';
import { GraphModel, type GraphEdge, type GraphNode } from '@dxos/graph';
import { NodeType, type ComputeEdge, type ComputeGraph, type ComputeNode } from './schema';

describe('effect-streams', () => {
  test('should work', async ({ expect }) => {
    const stream = Stream.range(1, 10);

    const sum = stream.pipe(Stream.runFold(0, (acc, x) => acc + x));

    await expect(Effect.runPromise(sum)).resolves.toBe(55);
  });

  test('stream instanceof checks', ({ expect }) => {
    expect(isStream(Stream.range(1, 10))).toBe(true);
    expect(isStream({})).toBe(false);
    expect(isStream(1)).toBe(false);
    expect(isStream('')).toBe(false);
    expect(isStream(null)).toBe(false);
    expect(isStream(undefined)).toBe(false);
    expect(isStream(true)).toBe(false);
    expect(isStream(false)).toBe(false);
    expect(isStream(new ReadableStream())).toBe(false);
  });
});
