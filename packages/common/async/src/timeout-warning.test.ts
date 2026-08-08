//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test, vi } from 'vitest';

import { type LogConfig, type LogEntry, LogLevel, log } from '@dxos/log';

import { warnAfterTimeout } from './timeout-warning';
import { Trigger } from './trigger';

describe('warnAfterTimeout', () => {
  const captureEntries = (): { entries: LogEntry[]; remove: () => void } => {
    const entries: LogEntry[] = [];
    const remove = log.addProcessor((_config: LogConfig, entry: LogEntry) => {
      entries.push(entry);
    });
    return { entries, remove };
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  test('logs a warning carrying the caller context once the timeout elapses', async ({ expect }) => {
    const { entries, remove } = captureEntries();
    vi.useFakeTimers();
    try {
      const trigger = new Trigger();
      const promise = warnAfterTimeout(1_000, 'test action', () => trigger.wait(), {
        spaceId: 'B7DYYZUWYFZ52J6IX7ZPTQ5GIHNGA27MS',
        tags: ['personal'],
      });

      await vi.advanceTimersByTimeAsync(1_000);
      trigger.wake();
      await promise;

      const warnings = entries.filter((entry) => entry.level === LogLevel.WARN);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].message).toContain('test action');
      expect(warnings[0].context).toMatchObject({
        spaceId: 'B7DYYZUWYFZ52J6IX7ZPTQ5GIHNGA27MS',
        tags: ['personal'],
        action: 'test action',
        timeout: 1_000,
      });
      expect(typeof (warnings[0].context as Record<string, unknown>).stack).toBe('string');
    } finally {
      remove();
    }
  });

  test('does not log when the action completes before the timeout', async ({ expect }) => {
    const { entries, remove } = captureEntries();
    vi.useFakeTimers();
    try {
      await expect(warnAfterTimeout(1_000, 'fast action', async () => 'done')).resolves.toBe('done');
      await vi.advanceTimersByTimeAsync(2_000);

      expect(entries.filter((entry) => entry.level === LogLevel.WARN)).toHaveLength(0);
    } finally {
      remove();
    }
  });
});
