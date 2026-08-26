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
export type ProcessState =
  | 'RUNNING'
  | 'HYBERNATING'
  | 'IDLE'
  | 'TERMINATING'
  | 'TERMINATED'
  | 'SUCCEEDED'
  | 'FAILED';

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

/**
 * A process's RPC surface is served as effect-rpc-over-HTTP: the host mounts an `RpcServer` for the
 * process's declared `RpcGroup` and the client drives it with `RpcClient` over
 * `RpcClient.makeProtocolHttp`. So the route has no envelope type of its own — the bodies are
 * whatever `RpcSerialization` is configured on both ends, and schema encoding of every request and
 * response is effect's, not ours.
 */
export const RPC_SERIALIZATION = 'ndjson' as const;

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
  /** Cursor to pass to the next read. */
  cursor: number;
  /**
   * True when events before `cursor` were dropped from the host's bounded ring before the caller
   * read them — the caller has an incomplete output history and should say so rather than treat the
   * page as contiguous.
   */
  truncated: boolean;
  info: ProcessInfo;
}
