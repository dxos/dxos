//
// Copyright 2026 DXOS.org
//

import * as Cron from 'effect/Cron';
import * as Schema from 'effect/Schema';

import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';
import * as MailSync from '@dxos/plugin-inbox/MailSync';

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

/** A copy seeded into Gmail tonight, as Gmail reports it. */
export type SeededMessage = { gmailId: string; subject?: string; sender?: string };

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

export type Failure = { class: FailureClass; message: string; pid?: string; gmailId?: string };
export type CheckResult = { id: string; name: string; ok: boolean; failures: Failure[] };

export type Report = {
  readonly ok: boolean;
  readonly checks: CheckResult[];
  readonly runs: { runs: number; invocations: number; succeeded: number; yielded: number; failed: number };
};

const MINUTE = 60_000;
// An invocation may stay open this long before it counts as killed.
const CLOSURE_GRACE_MS = 10 * MINUTE;
// Slack on the sync's cron interval for scheduler jitter.
const CADENCE_SLACK_MS = 2 * MINUTE;

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

/**
 * Runs checks C1–C7 over the sync runs since `since` and tonight's copies. It runs once the wait for the
 * copies is over, so a copy still absent is missing however recently it was seeded.
 */
export const runChecks = (
  snapshot: SpaceSnapshot,
  seeded: readonly SeededMessage[],
  { now, since }: { now: number; since: number },
): Report => {
  const invocations = snapshot.invocations.filter((invocation) => startOf(invocation) >= since);
  const ended = invocations.flatMap((invocation) => (invocation.end ? [{ ...invocation, end: invocation.end }] : []));
  const isRunAgain = (end: InvocationEnd) => end.errorCode === Process.RUN_AGAIN_ERROR_CODE;
  const failed = ended.filter(({ end }) => end.outcome === 'failure' && !isRunAgain(end));

  const closure: Failure[] = invocations
    .filter(({ startedAt, end }) => startedAt !== undefined && !end && now - startedAt > CLOSURE_GRACE_MS)
    .map(({ pid }) => ({ class: 'KILL', pid, message: 'invocation started but never ended' }));
  const outcome: Failure[] = failed.map(({ pid, end }) => ({
    class: classifyError(end.error, end.errorCode),
    pid,
    message: end.error ?? 'invocation failed without an error message',
  }));
  const triggers: Failure[] =
    snapshot.triggers.length === 0
      ? [{ class: 'OFF', message: 'no mail sync trigger in the space' }]
      : snapshot.triggers
          .filter(({ enabled }) => !enabled)
          .map(({ id }) => ({ class: 'OFF', message: `trigger ${id} is disabled` }));

  const synced = Map.groupBy(snapshot.messages, (message) => message.gmailId);
  const missingClass: FailureClass = failed.length > 0 || closure.length > 0 ? 'STALL' : 'DATA';
  const arrival: Failure[] = seeded
    .filter(({ gmailId }) => !synced.has(gmailId))
    .map(({ gmailId }) => ({ class: missingClass, gmailId, message: 'seeded message not synced' }));
  const duplicates: Failure[] = [...synced]
    .filter(([, copies]) => copies.length > 1)
    .map(([gmailId, copies]) => ({ class: 'DATA', gmailId, message: `synced ${copies.length} times` }));
  const content: Failure[] = seeded.flatMap((expected) =>
    (synced.get(expected.gmailId) ?? []).flatMap((actual) => {
      const differ = (['subject', 'sender'] as const).filter(
        (field) => normalize(expected[field]) !== normalize(actual[field]),
      );
      return differ.length > 0
        ? [{ class: 'DATA' as const, gmailId: expected.gmailId, message: `${differ.join(', ')} differ` }]
        : [];
    }),
  );

  const checks = [
    check('C1', 'Every invocation ends', closure),
    check('C2', 'Every invocation succeeds', outcome),
    check('C3', 'Sync runs on schedule', cadenceGaps(invocations, since, now)),
    check('C4', 'Sync trigger is enabled', triggers),
    check('C5', 'Seeded mail arrives', arrival),
    check('C6', 'No duplicates', duplicates),
    check('C7', 'Content matches Gmail', content),
  ];
  return {
    ok: checks.every(({ ok }) => ok),
    checks,
    runs: {
      runs: new Set(invocations.map(({ runId }) => runId)).size,
      invocations: invocations.length,
      succeeded: ended.filter(({ end }) => end.outcome === 'success').length,
      yielded: ended.filter(({ end }) => isRunAgain(end)).length,
      failed: failed.length,
    },
  };
};

const startOf = (invocation: Invocation): number => invocation.startedAt ?? invocation.end?.timestamp ?? 0;

const check = (id: string, name: string, failures: Failure[]): CheckResult => ({
  id,
  name,
  ok: failures.length === 0,
  failures,
});

/** Gaps longer than the sync's own cron interval (read off `MAIL_SYNC_CRON`) plus slack. */
const cadenceGaps = (invocations: readonly Invocation[], since: number, now: number): Failure[] => {
  const cron = Cron.parseUnsafe(MailSync.MAIL_SYNC_CRON);
  const first = Cron.next(cron, 0);
  const maxGap = Cron.next(cron, first).getTime() - first.getTime() + CADENCE_SLACK_MS;
  const points = [since, ...invocations.flatMap(({ startedAt }) => (startedAt === undefined ? [] : [startedAt])), now];
  return points.slice(1).flatMap((point, index) =>
    point - points[index] > maxGap
      ? [
          {
            class: 'IDLE' as const,
            message: `no sync for ${Math.round((point - points[index]) / MINUTE)} min after ${new Date(points[index]).toISOString()}`,
          },
        ]
      : [],
  );
};

// The mapper decodes HTML entities in the subject, so the comparison must too.
const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const normalize = (value?: string): string =>
  (value ?? '')
    .replace(/&(amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity])
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
