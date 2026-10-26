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
