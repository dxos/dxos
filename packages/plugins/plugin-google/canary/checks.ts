//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';

import { GoogleOperation } from '#types';

type InvocationEnd = Trace.PayloadType<typeof Trace.OperationEnd> & { readonly timestamp: number };

/** One mail sync invocation: the start and end events sharing a `pid`; `runId` groups `runAgain` continuations. */
export type Invocation = { pid: string; runId: string; startedAt?: number; end?: InvocationEnd };

/** What the canary reads from the space in one pass. */
export type SpaceSnapshot = {
  readonly invocations: readonly Invocation[];
  readonly messages: readonly { gmailId: string; subject?: string; sender?: string }[];
  readonly triggers: readonly { id: string; enabled: boolean }[];
};

/** A Gmail message the canary expects in the mailbox feed, as Gmail reports it. */
export type ExpectedMessage = { gmailId: string; subject?: string; sender?: string };

/** What broke, so a report names the cause rather than only the symptom. */
export type FailureClass =
  | 'DEADLINE'
  | 'REPO_CLOSED'
  | 'KILL'
  | 'AUTH'
  | 'HANG'
  | 'GONE'
  | 'RATE'
  | 'OFF'
  | 'STALL'
  | 'DATA'
  | 'SETUP'
  | 'UNKNOWN';

export type Failure = { class: FailureClass; message: string; pid?: string; gmailId?: string };
export type CheckResult = { id: string; name: string; ok: boolean; failures: Failure[] };

export type Report = {
  readonly ok: boolean;
  readonly checks: CheckResult[];
  readonly runs: RunStats;
};

const MINUTE = 60_000;
// An invocation may stay open this long before it counts as killed.
const CLOSURE_GRACE_MS = 10 * MINUTE;

const SYNC_KEY = GoogleOperation.GoogleMailSync.meta.key;
const isOperationEnd = Schema.is(Trace.OperationEnd.schema);

/** The mail sync's invocations in a set of trace messages, paired by `pid`, in start order. */
export const groupInvocations = (messages: readonly Trace.MessageData[]): Invocation[] => {
  const invocations = new Map<string, Invocation>();
  for (const { meta, events } of messages) {
    const pid = meta.pid;
    if (!pid) {
      continue;
    }
    const entry = () => {
      const invocation = invocations.get(pid) ?? { pid, runId: meta.runId ?? pid };
      invocations.set(pid, invocation);
      return invocation;
    };
    for (const event of events) {
      if (Trace.isOfType(Trace.OperationStart, event) && event.data.key === SYNC_KEY) {
        entry().startedAt = event.timestamp;
      } else if (
        Trace.isOfType(Trace.OperationEnd, event) &&
        isOperationEnd(event.data) &&
        event.data.key === SYNC_KEY
      ) {
        entry().end = { ...event.data, timestamp: event.timestamp };
      }
    }
  }
  return [...invocations.values()].sort((left, right) => startOf(left) - startOf(right));
};

const ERROR_CLASSES: readonly (readonly [RegExp, FailureClass])[] = [
  [/InvocationDeadlineError|did not complete within/i, 'DEADLINE'],
  [/RepoClosedError/i, 'REPO_CLOSED'],
  [/exceeded ?memory|memory limit|exceeded ?cpu/i, 'KILL'],
  [/managed access token|invalid_grant|reauthenticate|unauthori[sz]ed|credential/i, 'AUTH'],
  [/operation not found/i, 'GONE'],
  [/hung|canceled this request|cancelled this request/i, 'HANG'],
  [/\b429\b|rate limit|\b5\d\d\b|transport error/i, 'RATE'],
];

/** Names the failure class of a failed invocation from its error text and code. */
export const classifyError = (error = '', errorCode = ''): FailureClass =>
  ERROR_CLASSES.find(([pattern]) => pattern.test(`${errorCode} ${error}`))?.[1] ?? 'UNKNOWN';

/** Counts of the mail sync's invocations in a window. */
export type RunStats = { runs: number; invocations: number; succeeded: number; yielded: number; failed: number };

/**
 * Every invocation since `since` ended, and none failed; a `runAgain` yield is a continuation, not a failure.
 * `troubled` says whether any run failed or hung, which names the likeliest cause of a missing message.
 */
export const checkRuns = (
  id: string,
  invocations: readonly Invocation[],
  { now, since }: { now: number; since: number },
): { check: CheckResult; runs: RunStats; troubled: boolean } => {
  const inWindow = invocations.filter((invocation) => startOf(invocation) >= since);
  const ended = inWindow.flatMap((invocation) => (invocation.end ? [{ ...invocation, end: invocation.end }] : []));
  const isRunAgain = (end: InvocationEnd) => end.errorCode === Process.RUN_AGAIN_ERROR_CODE;
  const failed = ended.filter(({ end }) => end.outcome === 'failure' && !isRunAgain(end));
  const hung: Failure[] = inWindow
    .filter(({ startedAt, end }) => startedAt !== undefined && !end && now - startedAt > CLOSURE_GRACE_MS)
    .map(({ pid }) => ({ class: 'KILL', pid, message: 'invocation started but never ended' }));
  const failures: Failure[] = failed.map(({ pid, end }) => ({
    class: classifyError(end.error, end.errorCode),
    pid,
    message: end.error ?? 'invocation failed without an error message',
  }));
  return {
    check: check(id, 'No sync failures', [...hung, ...failures]),
    runs: {
      runs: new Set(inWindow.map(({ runId }) => runId)).size,
      invocations: inWindow.length,
      succeeded: ended.filter(({ end }) => end.outcome === 'success').length,
      yielded: ended.filter(({ end }) => isRunAgain(end)).length,
      failed: failed.length,
    },
    troubled: failed.length > 0 || hung.length > 0,
  };
};

/**
 * Each expected Gmail message is in the mailbox feed exactly once, with Gmail's subject and sender where those
 * are given. A missing message is named by its likeliest cause: no sync to run, sync runs that broke, or a
 * sync that ran clean and dropped it.
 */
export const checkMessages = (
  id: string,
  name: string,
  snapshot: Pick<SpaceSnapshot, 'messages' | 'triggers'>,
  expected: readonly ExpectedMessage[],
  troubled: boolean,
): CheckResult => {
  const missingClass: FailureClass = !snapshot.triggers.some(({ enabled }) => enabled)
    ? 'OFF'
    : troubled
      ? 'STALL'
      : 'DATA';
  const synced = Map.groupBy(snapshot.messages, (message) => message.gmailId);
  const failures: Failure[] = expected.flatMap((message) => {
    const actual = synced.get(message.gmailId) ?? [];
    if (actual.length === 0) {
      return [{ class: missingClass, gmailId: message.gmailId, message: 'Gmail message not synced' }];
    }
    if (actual.length > 1) {
      return [{ class: 'DATA', gmailId: message.gmailId, message: `synced ${actual.length} times` }];
    }
    const differ = (['subject', 'sender'] as const).filter(
      (field) => message[field] !== undefined && normalize(message[field]) !== normalize(actual[0][field]),
    );
    return differ.length > 0
      ? [{ class: 'DATA', gmailId: message.gmailId, message: `${differ.join(', ')} differ` }]
      : [];
  });
  return check(id, name, failures);
};

/**
 * The monitor's checks over the space's sync runs since `since` and, when it seeded tonight, its copies. It runs
 * once the wait for the copies is over, so a copy still absent is missing however recently it was seeded.
 *
 * - S1, every seeded copy synced: each is in the mailbox feed once, with Gmail's subject and sender.
 * - S2, no sync failures: every invocation in the window ended, and none failed.
 */
export const runChecks = (
  snapshot: SpaceSnapshot,
  seeded: readonly ExpectedMessage[] | undefined,
  window: { now: number; since: number },
): Report => {
  const { check: runs, runs: stats, troubled } = checkRuns('S2', snapshot.invocations, window);
  const checks = [
    ...(seeded ? [checkMessages('S1', 'Every seeded message synced', snapshot, seeded, troubled)] : []),
    runs,
  ];
  return { ok: checks.every(({ ok }) => ok), checks, runs: stats };
};

const startOf = (invocation: Invocation): number => invocation.startedAt ?? invocation.end?.timestamp ?? 0;

const check = (id: string, name: string, failures: Failure[]): CheckResult => ({
  id,
  name,
  ok: failures.length === 0,
  failures,
});

// The mapper decodes HTML entities in the subject, so the comparison must too.
const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const normalize = (value?: string): string =>
  (value ?? '')
    .replace(/&(amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity])
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
