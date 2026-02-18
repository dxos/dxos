//
// Copyright 2025 DXOS.org
//

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { InvariantViolation } from '@dxos/invariant';
import { type LogConfig, type LogEntry, LogLevel } from '@dxos/log';

// Replace the posthog-js module with a stub so log-processor's top-level import resolves to our mock.
// Dynamic imports are used so that both the mock and log-processor are loaded after vi.mock is hoisted.
vi.mock('posthog-js', () => ({
  default: {
    captureException: vi.fn(),
  },
}));
const { default: posthog } = await import('posthog-js');
const { logProcessor } = await import('./log-processor');

const baseConfig: LogConfig = {
  options: {},
  captureFilters: [{ level: LogLevel.WARN }],
  processors: [],
};

const createEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
  level: LogLevel.ERROR,
  message: 'test error',
  ...overrides,
});

describe('logProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('skips entries that do not pass capture filters', () => {
    const entry = createEntry({ level: LogLevel.DEBUG });
    logProcessor(baseConfig, entry);
    expect(posthog.captureException).not.toHaveBeenCalled();
  });

  test('skips entries from remote sessions', () => {
    const entry = createEntry({
      error: new Error('test'),
      meta: { F: 'test.ts', L: 1, S: { remoteSessionId: 'remote-123' } },
    });
    logProcessor(baseConfig, entry);
    expect(posthog.captureException).not.toHaveBeenCalled();
  });

  test('skips entries without errors', () => {
    const entry = createEntry({ error: undefined, context: {} });
    logProcessor(baseConfig, entry);
    expect(posthog.captureException).not.toHaveBeenCalled();
  });

  test('captures error from entry.error', () => {
    const error = new Error('direct error');
    const entry = createEntry({
      error,
      meta: { F: 'packages/sdk/observability/src/test.ts', L: 42, S: undefined },
    });
    logProcessor(baseConfig, entry);
    expect(posthog.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        transaction: 'packages/sdk/observability/src/test.ts:42',
      }),
    );
  });

  test('captures error from context when level is ERROR but no entry.error', () => {
    const contextError = new Error('context error');
    const entry = createEntry({
      level: LogLevel.ERROR,
      error: undefined,
      context: { someKey: contextError },
      meta: { F: 'test.ts', L: 10, S: undefined },
    });
    logProcessor(baseConfig, entry);
    expect(posthog.captureException).toHaveBeenCalledWith(contextError, expect.any(Object));
  });

  test('sets transaction from file:line metadata', () => {
    const entry = createEntry({
      error: new Error('err'),
      meta: { F: '/home/user/project/packages/sdk/observability/src/index.ts', L: 99, S: undefined },
    });
    logProcessor(baseConfig, entry);
    expect(posthog.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        transaction: 'packages/sdk/observability/src/index.ts:99',
      }),
    );
  });

  test('sets service_host_issue/session for worker entries', () => {
    const entry = createEntry({
      error: new Error('worker err'),
      meta: { F: 'test.ts', L: 1, S: { hostSessionId: 'host-abc' } },
    });
    logProcessor(baseConfig, entry);
    expect(posthog.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        service_host_issue: true,
        service_host_session: 'host-abc',
      }),
    );
  });

  test('sets uptime_seconds from metadata', () => {
    const entry = createEntry({
      error: new Error('err'),
      meta: { F: 'test.ts', L: 1, S: { uptimeSeconds: 123 } },
    });
    logProcessor(baseConfig, entry);
    expect(posthog.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        uptime_seconds: 123,
      }),
    );
  });

  test('sets invariant_violation flag for InvariantViolation errors', () => {
    const error = new InvariantViolation('broken invariant');
    const entry = createEntry({
      error,
      meta: { F: 'test.ts', L: 1, S: undefined },
    });
    logProcessor(baseConfig, entry);
    expect(posthog.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        invariant_violation: true,
      }),
    );
  });

  test('does not set invariant_violation for normal errors', () => {
    const error = new Error('normal error');
    const entry = createEntry({
      error,
      meta: { F: 'test.ts', L: 1, S: undefined },
    });
    logProcessor(baseConfig, entry);
    const callArgs = vi.mocked(posthog.captureException).mock.calls[0];
    expect(callArgs[1]).not.toHaveProperty('invariant_violation');
  });
});

describe('getRelativeFilename', () => {
  // We test this indirectly through the transaction property set by logProcessor.

  test('extracts relative path from absolute path containing packages/', () => {
    const entry = createEntry({
      error: new Error('err'),
      meta: { F: '/home/user/code/packages/sdk/observability/src/file.ts', L: 5, S: undefined },
    });
    logProcessor(baseConfig, entry);
    expect(posthog.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        transaction: 'packages/sdk/observability/src/file.ts:5',
      }),
    );
  });

  test('returns original filename if no match', () => {
    const entry = createEntry({
      error: new Error('err'),
      meta: { F: 'no-packages-here.ts', L: 1, S: undefined },
    });
    logProcessor(baseConfig, entry);
    expect(posthog.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        transaction: 'no-packages-here.ts:1',
      }),
    );
  });
});
