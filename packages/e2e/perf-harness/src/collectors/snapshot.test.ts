//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseDetailedDump } from './snapshot.ts';

const size = (bytes: number) => ({ effective_size: { value: bytes.toString(16) } });

describe('parseDetailedDump', () => {
  test('subtracts cross-tree ownership views and shared-backed nodes from the private sum', ({ expect }) => {
    const [renderer] = parseDetailedDump([
      { ph: 'M', pid: 7, name: 'process_name', args: { name: 'Renderer' } },
      {
        ph: 'v',
        pid: 7,
        args: {
          dumps: {
            process_totals: { private_footprint_bytes: (1_000).toString(16) },
            allocators: {
              'blink_gc': { guid: 'gc', attrs: size(300) },
              'blink_objects': { guid: 'objects', attrs: size(200) },
              'blink_objects/Node': { guid: 'node', attrs: size(200) },
              'gpu': { guid: 'gpu', attrs: size(50) },
              'v8': { guid: 'v8', attrs: size(400) },
            },
            allocators_graph: [{ source: 'node', target: 'gc', type: 'ownership' }],
          },
        },
      },
    ]);

    expect(renderer.process).toBe('Renderer');
    expect(renderer.allocators).toEqual({ v8: 400, blink_gc: 300, blink_objects: 0 });
    expect(renderer.privateAllocatorBytes).toBe(700);
    expect(renderer.sharedBackedBytes).toBe(50);
    expect(renderer.unattributedBytes).toBe(300);
    expect(renderer.children).toEqual({ 'blink_objects/Node': 200 });
  });

  test('merges a process whose totals and allocators arrive in separate events', ({ expect }) => {
    const [process] = parseDetailedDump([
      { ph: 'v', pid: 3, args: { dumps: { process_totals: { private_footprint_bytes: (100).toString(16) } } } },
      { ph: 'v', pid: 3, args: { dumps: { allocators: { malloc: { attrs: size(60) } } } } },
    ]);

    expect(process.footprintBytes).toBe(100);
    expect(process.unattributedBytes).toBe(40);
  });
});
