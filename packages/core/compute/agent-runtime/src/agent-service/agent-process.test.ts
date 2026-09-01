//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { Alarm } from '@dxos/assistant';
import * as Process from '@dxos/compute/Process';
import { ContentBlock, Message } from '@dxos/types';

import { computeAlarmDelay, isAgentWorkPending } from './agent-process';

const NOW = new Date('2026-06-04T12:00:00.000Z').getTime();

describe('computeAlarmDelay', () => {
  it('wakes immediately when there is pending work', ({ expect }) => {
    expect(computeAlarmDelay({ hasPendingWork: true, wakeAt: NOW + 10_000, now: NOW })).toBe(0);
    expect(computeAlarmDelay({ hasPendingWork: true, wakeAt: null, now: NOW })).toBe(0);
  });

  it('schedules a future self-wake when idle', ({ expect }) => {
    expect(computeAlarmDelay({ hasPendingWork: false, wakeAt: NOW + 10_000, now: NOW })).toBe(10_000);
  });

  it('wakes immediately when a self-wake is already due', ({ expect }) => {
    expect(computeAlarmDelay({ hasPendingWork: false, wakeAt: NOW - 10_000, now: NOW })).toBe(0);
  });

  it('schedules nothing when idle and no self-wake is set', ({ expect }) => {
    expect(computeAlarmDelay({ hasPendingWork: false, wakeAt: null, now: NOW })).toBe(null);
  });
});

// The completion decision (`maybeComplete` → `ctx.succeed()`) is exercised at two levels: the
// `isAgentWorkPending` suite below covers the predicate the process consults (queue / feed queue /
// alarms / delegations / pending tool results), and `AgentService.test.ts` covers the process
// reaching a terminal state and respawning for a follow-up turn end-to-end.

describe('isAgentWorkPending', () => {
  const makeSnapshot = (overrides: Partial<Parameters<typeof isAgentWorkPending>[0]> = {}) =>
    ({
      inputQueue: [],
      pendingMessages: [],
      pendingAlarms: [],
      delegations: [],
      toolCallManager: {
        hasPendingToolResults: () => false,
      },
      ...overrides,
    }) satisfies Parameters<typeof isAgentWorkPending>[0];

  it('is idle when nothing is pending', ({ expect }) => {
    expect(isAgentWorkPending(makeSnapshot())).toBe(false);
  });

  it('is pending when the legacy input queue has work', ({ expect }) => {
    expect(
      isAgentWorkPending(
        makeSnapshot({
          inputQueue: [{ _tag: 'prompt', content: [ContentBlock.Text.make({ text: 'hello' })] }],
        }),
      ),
    ).toBe(true);
  });

  it('is pending when the feed queue has an un-acked message', ({ expect }) => {
    expect(
      isAgentWorkPending(
        makeSnapshot({
          pendingMessages: [Message.make({ sender: { role: 'user' }, blocks: [] })],
        }),
      ),
    ).toBe(true);
  });

  it('is pending when an alarm is scheduled, even a future one', ({ expect }) => {
    expect(
      isAgentWorkPending(
        makeSnapshot({
          pendingAlarms: [Alarm.make({ wakeAt: NOW + 60_000 })],
        }),
      ),
    ).toBe(true);
  });

  it('is pending when subprocess delegations are in flight', ({ expect }) => {
    expect(
      isAgentWorkPending(
        makeSnapshot({
          delegations: [{ pid: Process.ID.make('child-1'), id: 'task-1' }],
        }),
      ),
    ).toBe(true);
  });

  it('is pending when tool results have not been delivered', ({ expect }) => {
    expect(
      isAgentWorkPending(
        makeSnapshot({
          toolCallManager: { hasPendingToolResults: () => true },
        }),
      ),
    ).toBe(true);
  });
});
