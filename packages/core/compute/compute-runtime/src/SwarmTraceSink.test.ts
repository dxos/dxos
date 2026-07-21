//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Trace } from '@dxos/compute';
import { Obj } from '@dxos/echo';

import * as SwarmTraceSink from './SwarmTraceSink';

// DX-1125: the producer sink is the inverse of the feed sink — it broadcasts ephemeral messages and
// ignores durable ones / messages without a space.

const makeMessage = (opts: { space?: string; isEphemeral: boolean; type: string }) =>
  Obj.make(Trace.Message, {
    meta: { pid: 'p1', ...(opts.space ? { space: opts.space } : {}) },
    isEphemeral: opts.isEphemeral,
    events: [{ timestamp: 0, type: opts.type, data: {} }],
  });

describe('createSwarmTraceSink', () => {
  test('publishes ephemeral messages with the message tags and encoded payload', ({ expect }) => {
    const published: { space: string; tags: string[]; payload: Uint8Array }[] = [];
    const sink = SwarmTraceSink.createSwarmTraceSink({ publish: (params) => published.push(params) });

    const msg = makeMessage({ space: 'SPACE1', isEphemeral: true, type: 'status.update' });
    sink.write(msg);

    expect(published).toHaveLength(1);
    expect(published[0].space).toBe('SPACE1');
    expect(published[0].tags).toEqual(Trace.messageToTags(msg));
    expect(published[0].tags).toContain('type:status.update');
    // Payload decodes back to an equivalent message.
    const decoded = Trace.decodeTraceMessage(published[0].payload);
    expect(decoded.events[0].type).toBe('status.update');
    expect(decoded.meta.space).toBe('SPACE1');
  });

  test('ignores durable messages (they go to the feed only)', ({ expect }) => {
    const published: unknown[] = [];
    const sink = SwarmTraceSink.createSwarmTraceSink({ publish: (params) => published.push(params) });
    sink.write(makeMessage({ space: 'SPACE1', isEphemeral: false, type: 'operation.end' }));
    expect(published).toHaveLength(0);
  });

  test('ignores messages with no space (cannot address a swarm)', ({ expect }) => {
    const published: unknown[] = [];
    const sink = SwarmTraceSink.createSwarmTraceSink({ publish: (params) => published.push(params) });
    sink.write(makeMessage({ isEphemeral: true, type: 'status.update' }));
    expect(published).toHaveLength(0);
  });
});
