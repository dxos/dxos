//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { classifyError, pairRuns, runChecks } from './checks.ts';
import { RUN_AGAIN_ERROR_CODE, type SeededMessage, type SpaceSnapshot, type SyncEvent } from './types.ts';

const MINUTE = 60_000;
const SINCE = Date.parse('2026-10-26T00:00:00Z');
const NOW = SINCE + 60 * MINUTE;

/** A healthy run every ten minutes across the window, each ending in success a minute later. */
const healthyEvents = (): SyncEvent[] =>
  Array.from({ length: 6 }, (_, index) => {
    const startedAt = SINCE + index * 10 * MINUTE + MINUTE;
    return [
      { pid: `run-${index}`, type: 'start' as const, timestamp: startedAt },
      { pid: `run-${index}`, type: 'end' as const, timestamp: startedAt + MINUTE, outcome: 'success' as const },
    ];
  }).flat();

const seeded: SeededMessage[] = [
  { gmailId: 'g1', insertedAt: SINCE, subject: 'Re: forecast', sender: 'phillip.allen@enron.com' },
  { gmailId: 'g2', insertedAt: NOW - 5 * MINUTE, subject: 'Too new to judge', sender: 'a@enron.com' },
];

const healthySnapshot = (): SpaceSnapshot => ({
  events: healthyEvents(),
  messages: [{ gmailId: 'g1', subject: 'Re:  forecast', sender: 'Phillip.Allen@enron.com' }],
  triggers: [{ id: 'trigger-1', enabled: true }],
});

const failedChecks = (snapshot: SpaceSnapshot, messages = seeded) =>
  runChecks(snapshot, messages, { now: NOW, since: SINCE })
    .checks.filter((check) => !check.ok)
    .map((check) => check.id);

describe('runChecks', () => {
  test('passes a healthy window', ({ expect }) => {
    const report = runChecks(healthySnapshot(), seeded, { now: NOW, since: SINCE });
    expect(report.ok).toBe(true);
    expect(report.runs).toEqual({ total: 6, succeeded: 6, yielded: 0, failed: 0, open: 0 });
  });

  test('a run-again yield is not a failure', ({ expect }) => {
    const events = healthyEvents().map((event) =>
      event.pid === 'run-2' && event.type === 'end'
        ? { ...event, outcome: 'failure' as const, errorCode: RUN_AGAIN_ERROR_CODE }
        : event,
    );
    const report = runChecks({ ...healthySnapshot(), events }, seeded, { now: NOW, since: SINCE });
    expect(report.ok).toBe(true);
    expect(report.runs.yielded).toBe(1);
  });

  test('a failure between two successes is still caught and classified', ({ expect }) => {
    const events = healthyEvents().map((event) =>
      event.pid === 'run-3' && event.type === 'end'
        ? {
            ...event,
            outcome: 'failure' as const,
            error: 'InvocationDeadlineError: Operation did not complete within 60000ms',
          }
        : event,
    );
    const report = runChecks({ ...healthySnapshot(), events }, seeded, { now: NOW, since: SINCE });
    const outcome = report.checks.find((check) => check.id === 'C2');
    expect(outcome?.failures).toEqual([expect.objectContaining({ class: 'DEADLINE', pid: 'run-3' })]);
  });

  test('a run that never ends counts as killed once it is old enough', ({ expect }) => {
    const events = healthyEvents().filter((event) => !(event.pid === 'run-1' && event.type === 'end'));
    expect(failedChecks({ ...healthySnapshot(), events })).toEqual(['C1']);
    const recent = healthyEvents().filter((event) => !(event.pid === 'run-5' && event.type === 'end'));
    expect(failedChecks({ ...healthySnapshot(), events: recent })).toEqual([]);
  });

  test('a gap in the schedule fails cadence', ({ expect }) => {
    const events = healthyEvents().filter((event) => !['run-2', 'run-3'].includes(event.pid));
    expect(failedChecks({ ...healthySnapshot(), events })).toEqual(['C3']);
  });

  test('a disabled or missing trigger fails', ({ expect }) => {
    expect(failedChecks({ ...healthySnapshot(), triggers: [{ id: 't', enabled: false }] })).toEqual(['C4']);
    expect(failedChecks({ ...healthySnapshot(), triggers: [] })).toEqual(['C4']);
  });

  test('missing mail is DATA when every run succeeded, STALL when runs failed', ({ expect }) => {
    const missing = { ...healthySnapshot(), messages: [] };
    const arrival = (snapshot: SpaceSnapshot) =>
      runChecks(snapshot, seeded, { now: NOW, since: SINCE }).checks.find((check) => check.id === 'C5');
    expect(arrival(missing)?.failures).toEqual([expect.objectContaining({ class: 'DATA', gmailId: 'g1' })]);

    const events = healthyEvents().map((event) =>
      event.type === 'end' ? { ...event, outcome: 'failure' as const, error: 'RepoClosedError' } : event,
    );
    expect(arrival({ ...missing, events })?.failures).toEqual([expect.objectContaining({ class: 'STALL' })]);
  });

  test('duplicates and content mismatches fail', ({ expect }) => {
    const snapshot = {
      ...healthySnapshot(),
      messages: [
        { gmailId: 'g1', subject: 'Re: forecast', sender: 'someone.else@enron.com' },
        { gmailId: 'g1', subject: 'Re: forecast', sender: 'someone.else@enron.com' },
      ],
    };
    expect(failedChecks(snapshot)).toEqual(['C6', 'C7']);
  });
});

describe('classifyError', () => {
  test.for([
    ['InvocationDeadlineError: Operation did not complete within 60000ms', 'DEADLINE'],
    ['RepoClosedError: repo proxy is closed', 'REPO_CLOSED'],
    ['Worker exceeded memory limit.', 'KILL'],
    ['Could not resolve managed access token 01M0: not_found', 'AUTH'],
    ['Operation not found: org.dxos.plugin.inbox.operation.googleMailSync', 'GONE'],
    ['Transport error (GET https://gmail.googleapis.com/gmail/v1/users/me/labels)', 'RATE'],
    ['something new', 'UNKNOWN'],
  ] as const)('%s → %s', ([error, expected], { expect }) => {
    expect(classifyError(error)).toBe(expected);
  });
});

describe('pairRuns', () => {
  test('orders runs by start and keeps an end that arrived first', ({ expect }) => {
    const runs = pairRuns([
      { pid: 'b', type: 'end', timestamp: 30, outcome: 'success' },
      { pid: 'a', type: 'start', timestamp: 10 },
      { pid: 'b', type: 'start', timestamp: 20 },
    ]);
    expect(runs.map((run) => [run.pid, Boolean(run.start), Boolean(run.end)])).toEqual([
      ['a', true, false],
      ['b', true, true],
    ]);
  });
});
