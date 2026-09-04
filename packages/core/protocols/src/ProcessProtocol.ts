//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type { SerializedError } from './edge';

/**
 * Wire protocol for controlling processes hosted by a remote runtime (EDGE).
 *
 * Mirrors the local `ProcessManager.Manager` / `ProcessManager.Handle` surface in
 * `@dxos/compute-runtime` over HTTP. Declared here rather than in `@dxos/compute` so that both the
 * client (`@dxos/edge-client`, which depends only on this package) and the EDGE worker can share one
 * definition instead of structurally re-declaring it on each side.
 *
 * Values are JSON-shaped: `Option`, `Exit` and `Date` from the in-process interfaces are flattened
 * (an absent `completedAt`, a `SerializedError`, epoch milliseconds).
 */

/** Runtime state of a process; the wire spelling of `Process.State`. */
export type ProcessState = 'RUNNING' | 'HYBERNATING' | 'IDLE' | 'TERMINATING' | 'TERMINATED' | 'SUCCEEDED' | 'FAILED';

/** Wire form of `Process.Environment`. */
export interface ProcessEnvironment {
  space?: string;
  conversation?: string;
}

/** Wire form of `Process.Params`. Annotation values are pre-encoded (JSON-safe). */
export interface ProcessParams {
  name: string | null;
  annotations: Record<string, unknown>;
}

/** Wire form of `Process.Info`. */
export interface ProcessInfo {
  pid: string;
  parentPid: string | null;
  key: string;
  params: ProcessParams;
  environment: ProcessEnvironment;
  state: ProcessState;
  /**
   * Absolute due-time (epoch ms) of the process's pending alarm, or `null` when none is scheduled.
   * Distinguishes hybernation waiting on more queued turn work from hybernation waiting only on
   * background children — the difference between the local `runToCompletion` and `runUntilSettled`
   * predicates, which cannot be told apart remotely without it.
   */
  alarmDueAt: number | null;
  error: SerializedError | null;
  startedAt: number;
  /** Absent unless the process has reached a terminal state. */
  completedAt?: number;
  metrics: {
    wallTime: number;
    inputCount: number;
    outputCount: number;
  };
}

/**
 * Spawn a process from the host's built-in registry. `key` is a `Process.Process.key`; the host
 * rejects a key it does not host, since a process definition cannot be sent over the wire.
 */
export interface SpawnProcessRequest {
  key: string;
  name?: string;
  parentPid?: string;
  environment?: ProcessEnvironment;
  annotations?: Record<string, unknown>;
}

export interface SpawnProcessResponse {
  info: ProcessInfo;
}

/** Filters mirroring `ProcessManager.ListOptions`. */
export interface ListProcessesQuery {
  key?: string;
  target?: string;
  state?: ProcessState;
}

export interface ListProcessesResponse {
  processes: ProcessInfo[];
}

/** Input encoded via the process definition's input schema. */
export interface SubmitInputRequest {
  input: unknown;
}

//
// A process's RPC surface is served as effect-rpc-over-HTTP: the host mounts an `RpcServer` for the
// process's declared `RpcGroup` and the client drives it with `RpcClient` over
// `RpcClient.makeProtocolHttp`, with `ndjson` serialization on both ends. So the route has no
// envelope type of its own — schema encoding of every request and response is effect's, not ours,
// and this module stays types-only (it is boot-reachable through the package barrel, so a single
// exported value would keep it in the eager graph).
//

/**
 * One event in a process's output/trace log. `seq` is monotonic per process and is what the cursor
 * read advances over, so a client that reconnects resumes where it left off.
 */
export type ProcessEvent =
  | { _tag: 'output'; seq: number; data: unknown }
  | { _tag: 'trace'; seq: number; message: unknown }
  | { _tag: 'exited'; seq: number; outcome: 'succeeded' | 'failed' | 'terminated'; error?: SerializedError };

/**
 * Page of events at or after the requested cursor, plus the process's state at read time so a
 * caller polling for settlement needs one request rather than two.
 */
export interface ProcessEventsResponse {
  events: ProcessEvent[];
  /**
   * Cursor to pass to the next read: the `seq` of the next unread event. A read at `cursor` returns
   * the events with `seq >= cursor`, so a read at or beyond the end returns an empty page whose
   * `cursor` is the current end — which is how a caller subscribes to new events only.
   *
   * Stated explicitly because client and host must agree on it, and the two readings (next `seq`
   * versus an opaque position) diverge as soon as `truncated` is true.
   */
  cursor: number;
  /**
   * True when events before `cursor` were dropped from the host's bounded ring before the caller
   * read them — the caller has an incomplete output history and should say so rather than treat the
   * page as contiguous.
   */
  truncated: boolean;
  info: ProcessInfo;
}
