//
// Copyright 2026 DXOS.org
//

import * as Cron from 'effect/Cron';
import * as Schema from 'effect/Schema';

import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';
import * as MailSync from '@dxos/plugin-inbox/MailSync';

import { GoogleOperation } from '#types';

/** How an invocation ended, as its `operation.end` event recorded it. */
export type InvocationEnd = Trace.PayloadType<typeof Trace.OperationEnd> & { readonly timestamp: number };

/**
 * One invocation of the mail sync: the `operation.start` and `operation.end` events that share a `pid`.
 * `runId` names the run it belongs to; an invocation that yields with `Operation.runAgain()` is continued
 * by another invocation of the same run.
 */
export type Invocation = {
  readonly pid: string;
  readonly runId: string;
  readonly startedAt?: number;
  readonly end?: InvocationEnd;
};

/** A message in the mailbox feed, reduced to what the checks compare. */
export type SyncedMessage = {
  readonly gmailId: string;
  readonly subject?: string;
  readonly sender?: string;
};

/** A sync trigger in the space. */
export type TriggerState = {
  readonly id: string;
  readonly enabled: boolean;
};

/** What the canary reads from the space in one pass. */
export type SpaceSnapshot = {
  readonly invocations: readonly Invocation[];
  readonly messages: readonly SyncedMessage[];
  readonly triggers: readonly TriggerState[];
};

/** A copy the canary inserted into Gmail, as Gmail reports it. */
export type SeededMessage = {
  readonly gmailId: string;
  /** Gmail `internalDate`, epoch milliseconds. */
  readonly insertedAt: number;
  readonly subject?: string;
  readonly sender?: string;
};

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
  | 'IDLE'
  | 'STALL'
  | 'DATA'
  | 'UNKNOWN';

export type Failure = {
  readonly class: FailureClass;
  readonly message: string;
  readonly pid?: string;
  readonly gmailId?: string;
};

export type CheckId = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7';

export type CheckResult = {
  readonly id: CheckId;
  readonly name: string;
  readonly ok: boolean;
  readonly failures: readonly Failure[];
};

/** Counts of the window's invocations; `runs` counts the distinct runs they belong to. */
export type RunSummary = {
  readonly runs: number;
  readonly invocations: number;
  readonly succeeded: number;
  readonly yielded: number;
  readonly failed: number;
  readonly open: number;
};

export type Report = {
  readonly ok: boolean;
  readonly checks: readonly CheckResult[];
  readonly runs: RunSummary;
};

export type CheckOptions = {
  /** Epoch milliseconds the checks are evaluated at. */
  readonly now: number;
  /** Start of the window the trace checks cover, epoch milliseconds. */
  readonly since: number;
};

const MINUTE = 60_000;
// An invocation may stay open this long before it counts as killed.
const CLOSURE_GRACE_MS = 10 * MINUTE;
// Slack on top of the sync's cron interval, to absorb scheduler jitter.
const CADENCE_SLACK_MS = 2 * MINUTE;

const SYNC_OPERATION_KEY = GoogleOperation.GoogleMailSync.meta.key;

const isOperationEnd = Schema.is(Trace.OperationEnd.schema);

/** The mail sync's invocations in a set of trace messages, paired by `pid`, in start order. */
export const groupInvocations = (messages: readonly Trace.MessageData[]): Invocation[] => {
  const invocations = new Map<string, { pid: string; runId: string; startedAt?: number; end?: InvocationEnd }>();
  for (const { meta, events } of messages) {
    const pid = meta.pid;
    if (!pid) {
      continue;
    }
    const invocation = () => {
      const entry = invocations.get(pid) ?? { pid, runId: meta.runId ?? pid };
      invocations.set(pid, entry);
      return entry;
    };
    for (const event of events) {
      if (Trace.isOfType(Trace.OperationStart, event) && event.data.key === SYNC_OPERATION_KEY) {
        invocation().startedAt = event.timestamp;
      } else if (
        Trace.isOfType(Trace.OperationEnd, event) &&
        isOperationEnd(event.data) &&
        event.data.key === SYNC_OPERATION_KEY
      ) {
        invocation().end = { ...event.data, timestamp: event.timestamp };
      }
    }
  }
  return [...invocations.values()].sort((left, right) => invocationTime(left) - invocationTime(right));
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

/** Names the failure class of a failed run from its error text and code. */
export const classifyError = (error = '', errorCode = ''): FailureClass =>
  ERROR_CLASSES.find(([pattern]) => pattern.test(`${errorCode} ${error}`))?.[1] ?? 'UNKNOWN';

/** Runs checks C1–C7 over one snapshot of the space and the copies seeded into Gmail. */
export const runChecks = (
  snapshot: SpaceSnapshot,
  seeded: readonly SeededMessage[],
  { now, since }: CheckOptions,
): Report => {
  const invocations = snapshot.invocations.filter((invocation) => invocationTime(invocation) >= since);
  const failed = invocations.filter((invocation) => invocation.end && isFailure(invocation.end));

  const closure: Failure[] = invocations
    .filter(
      (invocation) =>
        invocation.startedAt !== undefined && !invocation.end && now - invocation.startedAt > CLOSURE_GRACE_MS,
    )
    .map((invocation) => ({ class: 'KILL', pid: invocation.pid, message: 'invocation started but never ended' }));

  const outcome: Failure[] = failed.map((invocation) => ({
    class: classifyError(invocation.end?.error, invocation.end?.errorCode),
    pid: invocation.pid,
    message: invocation.end?.error ?? 'invocation failed without an error message',
  }));

  const cadence = cadenceGaps(invocations, { since, now });

  const triggers: Failure[] =
    snapshot.triggers.length === 0
      ? [{ class: 'OFF', message: 'no mail sync trigger in the space' }]
      : snapshot.triggers
          .filter((trigger) => !trigger.enabled)
          .map((trigger) => ({ class: 'OFF', message: `trigger ${trigger.id} is disabled` }));

  const synced = new Map<string, SyncedMessage[]>();
  for (const message of snapshot.messages) {
    synced.set(message.gmailId, [...(synced.get(message.gmailId) ?? []), message]);
  }
  // The checks run once the wait for the copies is over, so a copy still absent is missing however new it is.
  const missingClass: FailureClass = failed.length > 0 || closure.length > 0 ? 'STALL' : 'DATA';
  const arrival: Failure[] = seeded
    .filter((message) => !synced.has(message.gmailId))
    .map((message) => ({ class: missingClass, gmailId: message.gmailId, message: 'seeded message not synced' }));

  const duplicates: Failure[] = [...synced.entries()]
    .filter(([, copies]) => copies.length > 1)
    .map(([gmailId, copies]) => ({ class: 'DATA', gmailId, message: `synced ${copies.length} times` }));

  // Every copy that arrived is compared, however new: the grace only gives a missing copy time to arrive.
  const content: Failure[] = seeded.flatMap((expected) =>
    (synced.get(expected.gmailId) ?? []).flatMap((actual) => {
      const mismatches = contentMismatches(expected, actual);
      return mismatches.length > 0
        ? [{ class: 'DATA' as const, gmailId: expected.gmailId, message: `${mismatches.join(', ')} differ` }]
        : [];
    }),
  );

  const checks: CheckResult[] = [
    result('C1', 'Every invocation ends', closure),
    result('C2', 'Every invocation succeeds', outcome),
    result('C3', 'Sync runs on schedule', cadence),
    result('C4', 'Sync trigger is enabled', triggers),
    result('C5', 'Seeded mail arrives', arrival),
    result('C6', 'No duplicates', duplicates),
    result('C7', 'Content matches Gmail', content),
  ];

  return {
    ok: checks.every((check) => check.ok),
    checks,
    runs: {
      runs: new Set(invocations.map((invocation) => invocation.runId)).size,
      invocations: invocations.length,
      succeeded: invocations.filter((invocation) => invocation.end?.outcome === 'success').length,
      yielded: invocations.filter((invocation) => invocation.end && isRunAgain(invocation.end)).length,
      failed: failed.length,
      open: invocations.filter((invocation) => !invocation.end).length,
    },
  };
};

const invocationTime = (invocation: Invocation): number => invocation.startedAt ?? invocation.end?.timestamp ?? 0;

const isRunAgain = (end: InvocationEnd): boolean =>
  end.outcome === 'failure' && end.errorCode === Process.RUN_AGAIN_ERROR_CODE;

const isFailure = (end: InvocationEnd): boolean => end.outcome === 'failure' && !isRunAgain(end);

const result = (id: CheckId, name: string, failures: Failure[]): CheckResult => ({
  id,
  name,
  ok: failures.length === 0,
  failures,
});

/** The trigger's interval, read off the cron expression routines schedule the sync with. */
const syncInterval = (): number => {
  const cron = Cron.parseUnsafe(MailSync.MAIL_SYNC_CRON);
  const first = Cron.next(cron, 0);
  return Cron.next(cron, first).getTime() - first.getTime();
};

const cadenceGaps = (invocations: readonly Invocation[], { since, now }: { since: number; now: number }): Failure[] => {
  const maxGap = syncInterval() + CADENCE_SLACK_MS;
  const starts = invocations.flatMap((invocation) =>
    invocation.startedAt !== undefined ? [invocation.startedAt] : [],
  );
  const points = [since, ...starts, now];
  return points.slice(1).flatMap((point, index) => {
    const gap = point - points[index];
    return gap > maxGap
      ? [
          {
            class: 'IDLE' as const,
            message: `no sync invocation for ${Math.round(gap / MINUTE)} min after ${new Date(points[index]).toISOString()}`,
          },
        ]
      : [];
  });
};

// The mapper decodes HTML entities in the subject, so the comparison must too.
const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

const normalize = (value?: string): string =>
  (value ?? '')
    .replace(/&(amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity])
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const contentMismatches = (expected: SeededMessage, actual: SyncedMessage): string[] => [
  ...(normalize(expected.subject) !== normalize(actual.subject) ? ['subject'] : []),
  ...(normalize(expected.sender) !== normalize(actual.sender) ? ['sender'] : []),
];
