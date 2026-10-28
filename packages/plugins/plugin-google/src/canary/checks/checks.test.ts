//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';

import { GoogleOperation } from '#types';

import {
  type Invocation,
  type SeededMessage,
  type SpaceSnapshot,
  classifyError,
  groupInvocations,
  runChecks,
} from './checks.ts';

const MINUTE = 60_000;
const SINCE = Date.parse('2026-10-26T00:00:00Z');
const NOW = SINCE + 60 * MINUTE;
const KEY = GoogleOperation.GoogleMailSync.meta.key;

/** A healthy invocation every ten minutes across the window, each ending in success a minute later. */
const healthyInvocations = (): Invocation[] =>
  Array.from({ length: 6 }, (_, index) => {
    const startedAt = SINCE + index * 10 * MINUTE + MINUTE;
    return {
      pid: `run-${index}`,
      runId: `run-${index}`,
      startedAt,
      end: { key: KEY, outcome: 'success' as const, timestamp: startedAt + MINUTE },
    };
  });

const withEnd = (pid: string, end: Partial<NonNullable<Invocation['end']>>) =>
  healthyInvocations().map((invocation) =>
    invocation.pid === pid && invocation.end ? { ...invocation, end: { ...invocation.end, ...end } } : invocation,
  );

const seeded: SeededMessage[] = [
  { gmailId: 'g1', insertedAt: SINCE, subject: 'Re: forecast', sender: 'phillip.allen@enron.com' },
  { gmailId: 'g2', insertedAt: NOW - 5 * MINUTE, subject: 'Too new to judge', sender: 'a@enron.com' },
];

const healthySnapshot = (): SpaceSnapshot => ({
  invocations: healthyInvocations(),
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
    expect(report.runs).toEqual({ runs: 6, invocations: 6, succeeded: 6, yielded: 0, failed: 0, open: 0 });
  });

  test('a run-again yield is not a failure', ({ expect }) => {
    const invocations = withEnd('run-2', { outcome: 'failure', errorCode: Process.RUN_AGAIN_ERROR_CODE });
    const report = runChecks({ ...healthySnapshot(), invocations }, seeded, { now: NOW, since: SINCE });
    expect(report.ok).toBe(true);
    expect(report.runs.yielded).toBe(1);
  });

  test('a failure between two successes is still caught and classified', ({ expect }) => {
    const invocations = withEnd('run-3', {
      outcome: 'failure',
      error: 'InvocationDeadlineError: Operation did not complete within 60000ms',
    });
    const report = runChecks({ ...healthySnapshot(), invocations }, seeded, { now: NOW, since: SINCE });
    const outcome = report.checks.find((check) => check.id === 'C2');
    expect(outcome?.failures).toEqual([expect.objectContaining({ class: 'DEADLINE', pid: 'run-3' })]);
  });

  test('an invocation that never ends counts as killed once it is old enough', ({ expect }) => {
    const open = (pid: string) =>
      healthyInvocations().map((invocation) =>
        invocation.pid === pid ? { ...invocation, end: undefined } : invocation,
      );
    expect(failedChecks({ ...healthySnapshot(), invocations: open('run-1') })).toEqual(['C1']);
    expect(failedChecks({ ...healthySnapshot(), invocations: open('run-5') })).toEqual([]);
  });

  test('a gap in the schedule fails cadence', ({ expect }) => {
    const invocations = healthyInvocations().filter((invocation) => !['run-2', 'run-3'].includes(invocation.pid));
    expect(failedChecks({ ...healthySnapshot(), invocations })).toEqual(['C3']);
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

    const invocations = healthyInvocations().map((invocation) => ({
      ...invocation,
      end: { key: KEY, outcome: 'failure' as const, error: 'RepoClosedError', timestamp: NOW },
    }));
    expect(arrival({ ...missing, invocations })?.failures).toEqual([expect.objectContaining({ class: 'STALL' })]);
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

  test('a copy that arrived inside the grace period is still compared', ({ expect }) => {
    const snapshot = {
      ...healthySnapshot(),
      messages: [
        ...healthySnapshot().messages,
        { gmailId: 'g2', subject: 'Too new to judge', sender: 'someone.else@enron.com' },
      ],
    };
    expect(failedChecks(snapshot)).toEqual(['C7']);
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

describe('groupInvocations', () => {
  const message = (meta: Trace.Meta, ...events: Trace.Event[]): Trace.MessageData => ({
    meta,
    isEphemeral: false,
    events,
  });
  const start = (timestamp: number, key: string = KEY): Trace.Event => ({
    type: Trace.OperationStart.key,
    timestamp,
    data: { key },
  });
  const end = (timestamp: number, data: Record<string, string> = {}): Trace.Event => ({
    type: Trace.OperationEnd.key,
    timestamp,
    data: { key: KEY, outcome: 'success', ...data },
  });

  test('pairs by pid in start order, keeps an end that arrived first and names the run', ({ expect }) => {
    const invocations = groupInvocations([
      message({ pid: 'b', runId: 'a' }, end(30)),
      message({ pid: 'a' }, start(10), end(15, { outcome: 'failure', errorCode: Process.RUN_AGAIN_ERROR_CODE })),
      message({ pid: 'b', runId: 'a' }, start(20)),
      message({ pid: 'c' }, start(5, 'dxn:org.dxos.operation.other')),
    ]);
    expect(invocations.map(({ pid, runId, startedAt, end }) => [pid, runId, startedAt, end?.outcome])).toEqual([
      ['a', 'a', 10, 'failure'],
      ['b', 'a', 20, 'success'],
    ]);
  });
});
