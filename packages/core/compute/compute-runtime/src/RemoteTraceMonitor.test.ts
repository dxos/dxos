//
// Copyright 2026 DXOS.org
//

import * as Chunk from 'effect/Chunk';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { Trace } from '@dxos/compute';
import { EffectEx } from '@dxos/effect';

import * as RemoteTraceMonitor from './RemoteTraceMonitor';

// DX-1125: the swarm-backed remote monitor derives the coarse subscription tag from the filter,
// decodes each broadcast payload, and re-applies the exact filter client-side.

const encode = (meta: Trace.Meta, type: string): Uint8Array =>
  Trace.encodeTraceMessage({ meta, isEphemeral: true, events: [{ timestamp: 0, type, data: {} }] });

describe('createSwarmRemoteTraceMonitor', () => {
  test('subscribes with the coarse tag and re-applies the exact filter', async ({ expect }) => {
    const requestedTags: string[][] = [];
    const monitor = RemoteTraceMonitor.createSwarmRemoteTraceMonitor({
      subscribe: (tags) => {
        requestedTags.push(tags);
        return Stream.fromIterable([
          encode({ pid: 'p1', space: 'SPACE1' }, 'status.update'), // matches
          encode({ pid: 'p1', space: 'SPACE1' }, 'operation.end'), // wrong event type
          encode({ pid: 'p2', space: 'SPACE1' }, 'status.update'), // wrong pid
        ]);
      },
    });

    const collected = await EffectEx.runPromise(
      Stream.runCollect(monitor.subscribeToTraceMessages({ type: 'status.update', pid: 'p1' })),
    );
    const messages = Chunk.toReadonlyArray(collected);

    // Coarse subscription uses the most selective present dimension (pid over type).
    expect(requestedTags).toEqual([['pid:p1']]);
    // Only the message matching the full AND filter survives.
    expect(messages).toHaveLength(1);
    expect(messages[0].meta.pid).toBe('p1');
    expect(messages[0].events[0].type).toBe('status.update');
  });

  test('empty filter subscribes with no tags (matches nothing at the swarm)', async ({ expect }) => {
    const requestedTags: string[][] = [];
    const monitor = RemoteTraceMonitor.createSwarmRemoteTraceMonitor({
      subscribe: (tags) => {
        requestedTags.push(tags);
        return Stream.empty;
      },
    });
    await EffectEx.runPromise(Stream.runCollect(monitor.subscribeToTraceMessages({})));
    expect(requestedTags).toEqual([[]]);
  });
});
