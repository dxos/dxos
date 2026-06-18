//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Trace } from '@dxos/compute';

import {
  formatPendingBlockStatus,
  pendingStatusFromEphemeralMessage,
  resolveEphemeralStatusUpdate,
} from './pending-block-status';

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
    const status = pendingStatusFromEphemeralMessage(
      ephemeralMessage([
        {
          type: Trace.OperationInput.key,
          timestamp: Date.now(),
          data: { key: 'org.dxos.function.agent.get-context', name: 'Get Agent Context', input: { foo: 'bar' } },
        },
      ]),
    );
    expect(status).toBe('Calling Get Agent Context (13 bytes)...');
  });

  test('leaves status unchanged (sticky) when partial block stream completes', ({ expect }) => {
    expect(
      resolveEphemeralStatusUpdate(
        ephemeralMessage([
          {
            type: 'assistant.partialBlock',
            timestamp: Date.now(),
            data: {
              messageId: 'msg-1',
              role: 'assistant',
              block: {
                _tag: 'toolCall',
                toolCallId: 'call-1',
                name: 'update-tasks',
                operationName: 'Update tasks',
                input: '{}',
                providerExecuted: false,
                pending: false,
              },
            },
          },
        ]),
      ),
    ).toBe('unchanged');
  });

  test('suppresses raw routine ULID status updates', ({ expect }) => {
    expect(
      pendingStatusFromEphemeralMessage(
        ephemeralMessage([
          { type: Trace.StatusUpdate.key, timestamp: Date.now(), data: { message: 'Running 01KVB9WBRG0000000000000000' } },
        ]),
      ),
    ).toBeUndefined();
  });

  test('keeps descriptive status updates', ({ expect }) => {
    expect(
      pendingStatusFromEphemeralMessage(
        ephemeralMessage([
          { type: Trace.StatusUpdate.key, timestamp: Date.now(), data: { message: 'Thinking about the plan' } },
        ]),
      ),
    ).toBe('Thinking about the plan');
  });
});

// `Trace.Message` is an ECHO object type, so a plain test literal does not structurally overlap it;
// build the minimal ephemeral envelope the status helpers read via a single boundary cast.
const ephemeralMessage = (events: readonly Trace.Event[]): Trace.Message =>
  ({ meta: { pid: 'pid-1' }, isEphemeral: true, events }) as unknown as Trace.Message;
