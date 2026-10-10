//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { latencySummary, requestLatency } from './latency.ts';
import { type RealmMark } from './marks.ts';

const page = (name: string, at: number, detail?: string): RealmMark => ({
  name,
  at,
  kind: 'page',
  realm: 'page',
  ...(detail ? { detail } : {}),
});

const worker = (name: string, at: number, detail?: string): RealmMark => ({
  ...page(name, at, detail),
  kind: 'worker',
  realm: 'worker',
});

describe('requestLatency', () => {
  test('joins a page submit with the worker request it caused, and later turns with their responses', ({ expect }) => {
    const latency = requestLatency({
      realms: 2,
      marks: [
        page('chat.submit', 1_000),
        worker('chat.message-written', 1_040),
        worker('ai.request', 1_100, 'tools'),
        // A side call without tools, issued mid-loop, is neither a turn nor a trigger.
        worker('ai.request', 1_150),
        worker('ai.response', 1_200),
        worker('ai.response', 1_400, 'tools'),
        worker('tool.result', 1_430),
        worker('ai.request', 1_460, 'tools'),
        worker('ai.response', 1_700, 'tools'),
        worker('tool.result', 1_710),
        worker('ai.request', 1_780, 'tools'),
      ],
    });
    expect(latency?.submitToRequestMs).toEqual([100]);
    expect(latency?.turnToRequestMs).toEqual([60, 80]);
    expect(latency?.submitPath).toEqual([
      { name: 'chat.message-written', kind: 'worker', ms: 40 },
      { name: 'ai.request', kind: 'worker', ms: 100 },
    ]);
    expect(latency?.turnPath).toEqual([
      { name: 'tool.result', kind: 'worker', ms: 20 },
      { name: 'ai.request', kind: 'worker', ms: 70 },
    ]);
  });

  test('a submit waiting for its request is not displaced by an earlier turn finishing', ({ expect }) => {
    const latency = requestLatency({
      realms: 1,
      marks: [page('chat.submit', 0), page('ai.response', 10, 'tools'), page('ai.request', 50, 'tools')],
    });
    expect(latency?.submitToRequestMs).toEqual([50]);
    expect(latency?.turnToRequestMs).toEqual([]);
  });

  test('counts every request as a turn when none offers tools, and is absent without requests', ({ expect }) => {
    expect(requestLatency({ realms: 1, marks: [page('chat.submit', 0)] })).toBeUndefined();
    const latency = requestLatency({
      realms: 1,
      marks: [page('chat.submit', 0), page('ai.request', 30), page('ai.response', 90), page('ai.request', 95)],
    });
    expect(latency?.submitToRequestMs).toEqual([30]);
    expect(latency?.turnToRequestMs).toEqual([5]);
  });
});

describe('latencySummary', () => {
  test('median, max and count, zero-filled when empty', ({ expect }) => {
    expect(latencySummary([30, 10, 20, 100])).toEqual({ p50: 25, max: 100, count: 4 });
    expect(latencySummary([])).toEqual({ p50: 0, max: 0, count: 0 });
  });
});
