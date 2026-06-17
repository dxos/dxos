//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Trace } from '@dxos/compute';

import { formatPendingBlockStatus, pendingStatusFromEphemeralMessage } from './pending-block-status';

describe('formatPendingBlockStatus', () => {
  test('formats pending text as generating tokens', ({ expect }) => {
    const status = formatPendingBlockStatus({
      _tag: 'text',
      text: 'Hello world',
      pending: true,
    });
    expect(status).toMatch(/^Generating \d+ tokens\.\.\.\.$/);
  });

  test('formats pending tool call with byte count', ({ expect }) => {
    const status = formatPendingBlockStatus({
      _tag: 'toolCall',
      toolCallId: 'call-1',
      name: 'create-document',
      input: '{"title":"Haiku"}',
      providerExecuted: false,
      pending: true,
    });
    expect(status).toBe('Calling create-document (17 bytes)...');
  });

  test('returns undefined for completed blocks', ({ expect }) => {
    expect(
      formatPendingBlockStatus({
        _tag: 'text',
        text: 'Done',
        pending: false,
      }),
    ).toBeUndefined();
  });

  test('formats operation input as calling with byte count', ({ expect }) => {
    const status = pendingStatusFromEphemeralMessage({
      meta: { pid: 'pid-1' },
      isEphemeral: true,
      events: [
        {
          type: Trace.OperationInput.key,
          timestamp: Date.now(),
          data: { key: 'org.dxos.function.agent.get-context', name: 'Get Agent Context', input: { foo: 'bar' } },
        },
      ],
    } as Trace.Message);
    expect(status).toBe('Calling Get Agent Context (13 bytes)...');
  });
});
