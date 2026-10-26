//
// Copyright 2026 DXOS.org
//

/** Error code an operation ends with when it yields to `Operation.runAgain()` (`@dxos/compute` errors). */
export const RUN_AGAIN_ERROR_CODE = 'RunAgainError';

/** One `operation.start` or `operation.end` of the mail sync, read from the space's Execution Trace feed. */
export type SyncEvent = {
  readonly pid: string;
  readonly type: 'start' | 'end';
  readonly timestamp: number;
  readonly outcome?: 'success' | 'failure';
  readonly error?: string;
  readonly errorCode?: string;
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
  readonly events: readonly SyncEvent[];
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

export type RunSummary = {
  readonly total: number;
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
  /** How long a run may stay open before it counts as killed. */
  readonly closureGraceMs?: number;
  /** How long a seeded copy may take to appear in the mailbox feed. */
  readonly arrivalGraceMs?: number;
  /** Largest allowed gap between two sync starts. */
  readonly cadenceGapMs?: number;
};

const MINUTE = 60_000;
const DEFAULT_CLOSURE_GRACE_MS = 10 * MINUTE;
const DEFAULT_ARRIVAL_GRACE_MS = 25 * MINUTE;
// The sync trigger runs every 10 minutes; two minutes of slack absorbs cron jitter.
const DEFAULT_CADENCE_GAP_MS = 12 * MINUTE;

/** A sync run: the start and end events that share a `pid`. */
export type Run = {
  readonly pid: string;
  readonly start?: SyncEvent;
  readonly end?: SyncEvent;
};

/** Pairs start and end events by `pid`, in start order. */
export const pairRuns = (events: readonly SyncEvent[]): Run[] => {
  const runs = new Map<string, { pid: string; start?: SyncEvent; end?: SyncEvent }>();
  for (const event of events) {
    const run = runs.get(event.pid) ?? { pid: event.pid };
    run[event.type] = event;
    runs.set(event.pid, run);
  }
  return [...runs.values()].sort((left, right) => runTime(left) - runTime(right));
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
  {
    now,
    since,
    closureGraceMs = DEFAULT_CLOSURE_GRACE_MS,
    arrivalGraceMs = DEFAULT_ARRIVAL_GRACE_MS,
    cadenceGapMs = DEFAULT_CADENCE_GAP_MS,
  }: CheckOptions,
): Report => {
  const runs = pairRuns(snapshot.events).filter((run) => runTime(run) >= since);
  const failedRuns = runs.filter((run) => run.end && isFailure(run.end));

  const closure: Failure[] = runs
    .filter((run) => run.start && !run.end && now - run.start.timestamp > closureGraceMs)
    .map((run) => ({ class: 'KILL', pid: run.pid, message: 'run started but never ended' }));

  const outcome: Failure[] = failedRuns.map((run) => ({
    class: classifyError(run.end?.error, run.end?.errorCode),
    pid: run.pid,
    message: run.end?.error ?? 'run failed without an error message',
  }));

  const cadence = cadenceGaps(runs, { since, now, cadenceGapMs });

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
  const due = seeded.filter((message) => now - message.insertedAt > arrivalGraceMs);
  const missingClass: FailureClass = failedRuns.length > 0 || closure.length > 0 ? 'STALL' : 'DATA';
  const arrival: Failure[] = due
    .filter((message) => !synced.has(message.gmailId))
    .map((message) => ({ class: missingClass, gmailId: message.gmailId, message: 'seeded message not synced' }));

  const duplicates: Failure[] = [...synced.entries()]
    .filter(([, copies]) => copies.length > 1)
    .map(([gmailId, copies]) => ({ class: 'DATA', gmailId, message: `synced ${copies.length} times` }));

  const content: Failure[] = due.flatMap((expected) => {
    const actual = synced.get(expected.gmailId)?.[0];
    const mismatches = actual ? contentMismatches(expected, actual) : [];
    return mismatches.length > 0
      ? [{ class: 'DATA' as const, gmailId: expected.gmailId, message: `${mismatches.join(', ')} differ` }]
      : [];
  });

  const checks: CheckResult[] = [
    result('C1', 'Every run ends', closure),
    result('C2', 'Every run succeeds', outcome),
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
      total: runs.length,
      succeeded: runs.filter((run) => run.end?.outcome === 'success').length,
      yielded: runs.filter((run) => run.end && run.end.outcome !== 'success' && !isFailure(run.end)).length,
      failed: failedRuns.length,
      open: runs.filter((run) => !run.end).length,
    },
  };
};

const runTime = (run: Run): number => run.start?.timestamp ?? run.end?.timestamp ?? 0;

const isFailure = (end: SyncEvent): boolean => end.outcome === 'failure' && end.errorCode !== RUN_AGAIN_ERROR_CODE;

const result = (id: CheckId, name: string, failures: Failure[]): CheckResult => ({
  id,
  name,
  ok: failures.length === 0,
  failures,
});

const cadenceGaps = (
  runs: readonly Run[],
  { since, now, cadenceGapMs }: { since: number; now: number; cadenceGapMs: number },
): Failure[] => {
  const starts = runs.flatMap((run) => (run.start ? [run.start.timestamp] : []));
  const points = [since, ...starts, now];
  return points.slice(1).flatMap((point, index) => {
    const gap = point - points[index];
    return gap > cadenceGapMs
      ? [
          {
            class: 'IDLE' as const,
            message: `no sync run for ${Math.round(gap / MINUTE)} min after ${new Date(points[index]).toISOString()}`,
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
