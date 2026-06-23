//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Trace } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { Ref } from '@dxos/echo';
import { EID, EntityId } from '@dxos/keys';

import { groupIntoRuns } from './runs';

// Minimal Ref-like object whose `.uri` is a valid EID.
const makeRef = (entityId: EntityId): any => Ref.fromURI(EID.make({ entityId }));

// Construct a bare-minimum Trace.Message for testing (no ECHO DB required).
const makeMessage = (opts: {
  pid: string;
  parentPid?: string;
  triggerEntityId?: EntityId;
  eventType?: string;
  eventOutcome?: string;
  timestamp?: number;
}): Trace.Message => {
  const event: any = {
    type: opts.eventType ?? Trace.OperationStart.key,
    timestamp: opts.timestamp ?? Date.now(),
    data: opts.eventOutcome ? { key: 'test', outcome: opts.eventOutcome } : { key: 'test' },
  };
  return Obj.make(Trace.Message, {
    meta: {
      pid: opts.pid,
      parentPid: opts.parentPid,
      trigger: opts.triggerEntityId ? makeRef(opts.triggerEntityId) : undefined,
    },
    isEphemeral: false,
    events: [event],
  });
};

const TRIGGER_ID = 'aaaaaaaa-0000-0000-0000-000000000001' as EntityId;
const OTHER_TRIGGER_ID = 'bbbbbbbb-0000-0000-0000-000000000002' as EntityId;

describe('groupIntoRuns', () => {
  test('returns empty for no messages', ({ expect }) => {
    const runs = groupIntoRuns([], new Set([TRIGGER_ID]));
    expect(runs).toHaveLength(0);
  });

  test('returns empty when no messages match trigger ids', ({ expect }) => {
    const msg = makeMessage({ pid: 'p1', triggerEntityId: OTHER_TRIGGER_ID });
    const runs = groupIntoRuns([msg], new Set([TRIGGER_ID]));
    expect(runs).toHaveLength(0);
  });

  test('groups a single successful run', ({ expect }) => {
    const start = makeMessage({
      pid: 'p1',
      triggerEntityId: TRIGGER_ID,
      eventType: Trace.OperationStart.key,
      timestamp: 1000,
    });
    const end = makeMessage({
      pid: 'p1',
      triggerEntityId: TRIGGER_ID,
      eventType: Trace.OperationEnd.key,
      eventOutcome: 'success',
      timestamp: 3000,
    });
    const runs = groupIntoRuns([start, end], new Set([TRIGGER_ID]));
    expect(runs).toHaveLength(1);
    expect(runs[0].pid).toBe('p1');
    expect(runs[0].status).toBe('success');
    expect(runs[0].startedAt).toBe(1000);
    expect(runs[0].duration).toBe(2000);
  });

  test('marks run as failed when any OperationEnd is failure', ({ expect }) => {
    const start = makeMessage({
      pid: 'p1',
      triggerEntityId: TRIGGER_ID,
      eventType: Trace.OperationStart.key,
      timestamp: 1000,
    });
    const end = makeMessage({
      pid: 'p1',
      triggerEntityId: TRIGGER_ID,
      eventType: Trace.OperationEnd.key,
      eventOutcome: 'failure',
      timestamp: 2000,
    });
    const runs = groupIntoRuns([start, end], new Set([TRIGGER_ID]));
    expect(runs[0].status).toBe('failure');
  });

  test('marks run as pending when no OperationEnd event present', ({ expect }) => {
    const start = makeMessage({ pid: 'p1', triggerEntityId: TRIGGER_ID, timestamp: 1000 });
    const runs = groupIntoRuns([start], new Set([TRIGGER_ID]));
    expect(runs[0].status).toBe('pending');
  });

  test('sorts runs newest first', ({ expect }) => {
    const older = makeMessage({ pid: 'p1', triggerEntityId: TRIGGER_ID, timestamp: 1000 });
    const newer = makeMessage({ pid: 'p2', triggerEntityId: TRIGGER_ID, timestamp: 5000 });
    const runs = groupIntoRuns([older, newer], new Set([TRIGGER_ID]));
    expect(runs[0].pid).toBe('p2');
    expect(runs[1].pid).toBe('p1');
  });

  test('child process messages roll up to root run', ({ expect }) => {
    const parent = makeMessage({ pid: 'p1', triggerEntityId: TRIGGER_ID, timestamp: 1000 });
    const child = makeMessage({ pid: 'p2', parentPid: 'p1', triggerEntityId: TRIGGER_ID, timestamp: 2000 });
    const runs = groupIntoRuns([parent, child], new Set([TRIGGER_ID]));
    // Both messages belong to the same root run 'p1'.
    expect(runs).toHaveLength(1);
    expect(runs[0].pid).toBe('p1');
    expect(runs[0].duration).toBe(1000);
  });
});
