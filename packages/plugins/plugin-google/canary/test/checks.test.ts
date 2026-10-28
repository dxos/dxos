//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';

import { GoogleOperation } from '#types';

import { type Invocation, type SpaceSnapshot, classifyError, groupInvocations, runChecks } from '../checks.ts';

const MINUTE = 60_000;
const SINCE = Date.parse('2026-10-26T00:00:00Z');
const NOW = SINCE + 60 * MINUTE;
const KEY = GoogleOperation.GoogleMailSync.meta.key;

/** An invocation every ten minutes across the window, each ending a minute later. */
const invocations = (end: Partial<NonNullable<Invocation['end']>> = {}, pid = 'run-2'): Invocation[] =>
  Array.from({ length: 6 }, (_, index) => {
    const startedAt = SINCE + index * 10 * MINUTE + MINUTE;
    const outcome = { key: KEY, outcome: 'success' as const, timestamp: startedAt + MINUTE };
    return {
      pid: `run-${index}`,
      runId: `run-${index}`,
      startedAt,
      end: `run-${index}` === pid ? { ...outcome, ...end } : outcome,
    };
  });

const seeded = [
  { gmailId: 'g1', subject: 'Re: forecast', sender: 'phillip.allen@enron.com' },
  { gmailId: 'g2', subject: 'Re: travel', sender: 'a@enron.com' },
];

const healthy = (): SpaceSnapshot => ({
  invocations: invocations(),
  messages: [
    { gmailId: 'g1', subject: 'Re:  forecast', sender: 'Phillip.Allen@enron.com' },
    { gmailId: 'g2', subject: 'Re: travel', sender: 'a@enron.com' },
  ],
  triggers: [{ id: 'trigger-1', enabled: true }],
});

const failed = (snapshot: SpaceSnapshot) =>
  runChecks(snapshot, seeded, { now: NOW, since: SINCE }).checks.flatMap((check) => (check.ok ? [] : [check.id]));

describe('runChecks', () => {
  test('passes a healthy window', ({ expect }) => {
    const report = runChecks(healthy(), seeded, { now: NOW, since: SINCE });
    expect(report.ok).toBe(true);
    expect(report.runs).toEqual({ runs: 6, invocations: 6, succeeded: 6, yielded: 0, failed: 0 });
  });

  test('a run-again yield is not a failure, a failed invocation is classified', ({ expect }) => {
    const yielded = invocations({ outcome: 'failure', errorCode: Process.RUN_AGAIN_ERROR_CODE });
    expect(failed({ ...healthy(), invocations: yielded })).toEqual([]);
    const report = runChecks(
      { ...healthy(), invocations: invocations({ outcome: 'failure', error: 'RepoClosedError' }) },
      seeded,
      {
        now: NOW,
        since: SINCE,
      },
    );
    expect(report.checks[1].failures).toEqual([expect.objectContaining({ class: 'REPO_CLOSED', pid: 'run-2' })]);
  });

  test('an invocation that never ends, a gap and a disabled trigger fail', ({ expect }) => {
    const open = invocations().map((invocation) =>
      invocation.pid === 'run-1' ? { ...invocation, end: undefined } : invocation,
    );
    expect(failed({ ...healthy(), invocations: open })).toEqual(['C1']);
    expect(
      failed({ ...healthy(), invocations: invocations().filter((invocation) => invocation.pid !== 'run-3') }),
    ).toEqual(['C3']);
    expect(failed({ ...healthy(), triggers: [{ id: 't', enabled: false }] })).toEqual(['C4']);
  });

  test('missing mail is DATA when every run succeeded, STALL when runs failed', ({ expect }) => {
    const missing = { ...healthy(), messages: [healthy().messages[0]] };
    const arrival = (snapshot: SpaceSnapshot) =>
      runChecks(snapshot, seeded, { now: NOW, since: SINCE }).checks[4].failures;
    expect(arrival(missing)).toEqual([expect.objectContaining({ class: 'DATA', gmailId: 'g2' })]);
    expect(arrival({ ...missing, invocations: invocations({ outcome: 'failure', error: 'boom' }) })).toEqual([
      expect.objectContaining({ class: 'STALL', gmailId: 'g2' }),
    ]);
  });

  test('every synced copy is compared, so a wrong second copy fails content as well as duplicates', ({ expect }) => {
    const wrong = { gmailId: 'g1', subject: 'Re: forecast', sender: 'someone.else@enron.com' };
    expect(failed({ ...healthy(), messages: [...healthy().messages, wrong] })).toEqual(['C6', 'C7']);
  });
});

describe('groupInvocations', () => {
  test('pairs the mail sync start and end by pid and ignores other operations', ({ expect }) => {
    const message = (pid: string, type: string, timestamp: number, data: object): Trace.MessageData => ({
      meta: { pid },
      isEphemeral: false,
      events: [{ type, timestamp, data }],
    });
    expect(
      groupInvocations([
        message('a', Trace.OperationStart.key, 1, { key: KEY }),
        message('b', Trace.OperationStart.key, 2, { key: 'dxn:org.dxos.operation.other' }),
        message('a', Trace.OperationEnd.key, 3, { key: KEY, outcome: 'success' }),
      ]),
    ).toEqual([{ pid: 'a', runId: 'a', startedAt: 1, end: { key: KEY, outcome: 'success', timestamp: 3 } }]);
  });
});

describe('classifyError', () => {
  test.for([
    ['InvocationDeadlineError: Operation did not complete within 60000ms', 'DEADLINE'],
    ['invalid_grant', 'AUTH'],
    ['HTTP 429', 'RATE'],
    ['something else', 'UNKNOWN'],
  ] as const)('%s is %s', ([error, expected], { expect }) => {
    expect(classifyError(error)).toBe(expected);
  });
});
