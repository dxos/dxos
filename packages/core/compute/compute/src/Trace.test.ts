//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Trace from './Trace';

// DX-1125: the swarm broadcast tag/filter/wire helpers. The tag format is a cross-repo contract —
// the edge producer (functions-service) derives the same strings independently, so these lock it in.

const message = (
  meta: Trace.Meta,
  events: { type: string; data?: unknown }[],
  isEphemeral = true,
): Pick<Trace.MessageData, 'meta' | 'events' | 'isEphemeral'> => ({
  meta,
  isEphemeral,
  events: events.map((event) => ({ timestamp: 0, type: event.type, data: event.data ?? {} })),
});

describe('Trace.messageToTags', () => {
  test('emits a type tag per event and a key:value tag per present meta field', ({ expect }) => {
    const tags = Trace.messageToTags(
      message(
        {
          pid: 'p1',
          parentPid: 'p0',
          space: 'SPACE1',
          runtimeName: Trace.CommonRuntimeName.edgeIntrinsic,
          toolCallId: 'tc1',
        },
        [{ type: 'status.update' }, { type: 'operation.input' }],
      ),
    );

    expect(tags).toEqual(
      expect.arrayContaining([
        'type:status.update',
        'type:operation.input',
        'pid:p1',
        'parentPid:p0',
        'space:SPACE1',
        `runtime:${Trace.CommonRuntimeName.edgeIntrinsic}`,
        'toolCall:tc1',
      ]),
    );
  });

  test('omits absent meta fields', ({ expect }) => {
    const tags = Trace.messageToTags(message({ pid: 'p1' }, [{ type: 'status.update' }]));
    expect(tags).toEqual(['type:status.update', 'pid:p1']);
  });
});

describe('Trace.matchesFilter', () => {
  const msg = message({ pid: 'p1', space: 'SPACE1' }, [{ type: 'status.update' }]);

  test('empty filter matches anything', ({ expect }) => {
    expect(Trace.matchesFilter(msg, {})).toBe(true);
  });

  test('type matches when any event has the type', ({ expect }) => {
    expect(Trace.matchesFilter(msg, { type: 'status.update' })).toBe(true);
    expect(Trace.matchesFilter(msg, { type: 'operation.end' })).toBe(false);
  });

  test('ANDs all present fields', ({ expect }) => {
    expect(Trace.matchesFilter(msg, { type: 'status.update', pid: 'p1', space: 'SPACE1' })).toBe(true);
    // One mismatched dimension fails the whole filter.
    expect(Trace.matchesFilter(msg, { type: 'status.update', pid: 'other' })).toBe(false);
    expect(Trace.matchesFilter(msg, { space: 'SPACE2' })).toBe(false);
  });
});

describe('Trace.subscriptionTagForFilter', () => {
  test('picks the most selective present dimension', ({ expect }) => {
    // Priority: conversation > trigger > parentPid > pid > space > type.
    expect(Trace.subscriptionTagForFilter({ conversation: 'dxn:c', pid: 'p1', space: 's' })).toBe('conversation:dxn:c');
    expect(Trace.subscriptionTagForFilter({ pid: 'p1', space: 's' })).toBe('pid:p1');
    expect(Trace.subscriptionTagForFilter({ space: 's' })).toBe('space:s');
    expect(Trace.subscriptionTagForFilter({ type: 'status.update' })).toBe('type:status.update');
  });

  test('returns undefined for an empty filter (matches nothing at the swarm)', ({ expect }) => {
    expect(Trace.subscriptionTagForFilter({})).toBeUndefined();
  });
});

describe('Trace.encodeTraceMessage / decodeTraceMessage', () => {
  test('round-trips meta string fields, isEphemeral, and events', ({ expect }) => {
    const original = message({ pid: 'p1', space: 'SPACE1', runtimeName: Trace.CommonRuntimeName.edgeIntrinsic }, [
      { type: 'status.update', data: { message: 'Syncing', progress: { key: 'k1', current: 3, total: 10 } } },
    ]);

    const decoded = Trace.decodeTraceMessage(Trace.encodeTraceMessage(original));

    expect(decoded.isEphemeral).toBe(true);
    expect(decoded.meta.pid).toBe('p1');
    expect(decoded.meta.space).toBe('SPACE1');
    expect(decoded.meta.runtimeName).toBe(Trace.CommonRuntimeName.edgeIntrinsic);
    expect(decoded.events).toHaveLength(1);
    expect(decoded.events[0].type).toBe('status.update');
    expect((decoded.events[0].data as any).progress.key).toBe('k1');
    // The decoded value is a real Trace.Message and still matches its filter.
    expect(Trace.matchesFilter(decoded, { type: 'status.update', space: 'SPACE1' })).toBe(true);
  });

  test('a decoded message re-derives the same tags the producer would emit', ({ expect }) => {
    const original = message({ pid: 'p9', space: 'SPACE9' }, [{ type: 'status.update' }]);
    const decoded = Trace.decodeTraceMessage(Trace.encodeTraceMessage(original));
    expect(Trace.messageToTags(decoded)).toEqual(['type:status.update', 'pid:p9', 'space:SPACE9']);
  });
});
