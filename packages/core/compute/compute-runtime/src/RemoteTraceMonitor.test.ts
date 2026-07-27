//
// Copyright 2026 DXOS.org
//

import * as Chunk from 'effect/Chunk';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { Trace } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { EID } from '@dxos/keys';

import * as RemoteTraceMonitor from './RemoteTraceMonitor';

// DX-1125: the swarm-backed remote monitor derives the coarse subscription tag from the filter,
// decodes each broadcast payload, and re-applies the exact filter client-side.

const broadcast = (meta: Trace.Meta, type: string): RemoteTraceMonitor.SwarmTraceBroadcast => {
  const message = { meta, isEphemeral: true, events: [{ timestamp: 0, type, data: {} }] };
  return { payload: Trace.encodeTraceMessage(message), tags: Trace.messageToTags(message) };
};

describe('createSwarmRemoteTraceMonitor', () => {
  test('subscribes with the coarse tag and re-applies the exact filter', async ({ expect }) => {
    const requestedTags: string[][] = [];
    const monitor = RemoteTraceMonitor.createSwarmRemoteTraceMonitor({
      subscribe: (tags) => {
        requestedTags.push(tags);
        return Stream.fromIterable([
          broadcast({ pid: 'p1', space: 'SPACE1' }, 'status.update'), // matches
          broadcast({ pid: 'p1', space: 'SPACE1' }, 'operation.end'), // wrong event type
          broadcast({ pid: 'p2', space: 'SPACE1' }, 'status.update'), // wrong pid
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

  // The wire payload drops ref meta fields; the envelope tags must restore `meta.trigger` through
  // this seam or downstream cancel addressing silently loses its target (the mailbox-sync cancel bug).
  test('restores meta.trigger from the broadcast envelope tags', async ({ expect }) => {
    const trigger = Ref.fromURI(EID.make({ entityId: 'TRIGGER1' }));
    const monitor = RemoteTraceMonitor.createSwarmRemoteTraceMonitor({
      subscribe: () => Stream.fromIterable([broadcast({ pid: 'p1', space: 'SPACE1', trigger }, 'status.update')]),
    });

    const collected = await EffectEx.runPromise(
      Stream.runCollect(monitor.subscribeToTraceMessages({ type: 'status.update' })),
    );
    const messages = Chunk.toReadonlyArray(collected);

    expect(messages).toHaveLength(1);
    expect(messages[0].meta.trigger?.uri.toString()).toBe(trigger.uri.toString());
  });
});
