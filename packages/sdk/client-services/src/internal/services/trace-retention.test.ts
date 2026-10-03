//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { isPrunableTraceMessage } from './trace-retention.ts';

const message = (...types: string[]) => ({
  meta: { pid: 'pid' },
  events: types.map((type) => ({ type, timestamp: 0, data: {} })),
});

describe('isPrunableTraceMessage', () => {
  test('prunes messages carrying only operation start/end events', () => {
    expect(isPrunableTraceMessage(message('operation.start'))).toBe(true);
    expect(isPrunableTraceMessage(message('operation.start', 'operation.end'))).toBe(true);
  });

  test('keeps any message carrying another event, and anything not shaped like a trace message', () => {
    expect(isPrunableTraceMessage(message('operation.end', 'task.statusChanged'))).toBe(false);
    expect(isPrunableTraceMessage(message('assistant.delegationCompleted'))).toBe(false);
    expect(isPrunableTraceMessage(message())).toBe(false);
    expect(isPrunableTraceMessage({ id: 'not-a-trace-message' })).toBe(false);
  });
});
