//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';
import type * as Stream from 'effect/Stream';

import { BaseError } from '@dxos/errors';

import type {
  AttachedRepository,
  ExecRequest,
  ExecResult,
  ExposedPort,
  ExposePortOptions,
  FileEntry,
  SandboxRecord,
} from '../services/SandboxClient.ts';

/**
 * A sandbox request that could not be carried out — the backend failed, not the command: a command
 * exiting non-zero is an {@link ExecResult}, never this.
 */
export class SandboxError extends BaseError.extend('SandboxError', 'Sandbox request failed.') {}

export type CreateOptions = {
  name?: string;
  baseImage?: string;
  expiresIn?: number;
  repositories?: readonly AttachedRepository[];
};

export type JobRequest = {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
};

/** What a job printed, or how it ended; a job's output ends with exactly one `exit` or `error`. */
export type JobEvent =
  | { type: 'stdout' | 'stderr'; data: string }
  | { type: 'exit'; exitCode: number; success: boolean }
  | { type: 'error'; message: string };

/** Characters of each output stream already read; output resumes after them. */
export type JobOffsets = { stdout?: number; stderr?: number };

export type JobState = {
  status: 'starting' | 'running' | 'completed' | 'failed' | 'killed' | 'error';
  exitCode?: number;
};

export type JobSignal = 'SIGTERM' | 'SIGKILL' | 'SIGINT' | 'SIGHUP';

/**
 * A command running in a sandbox with its stdin open: output streams out and input is written in.
 * It belongs to the sandbox, not to the caller, so it keeps running after the call that started it
 * ends and any later call re-attaches by `id`. Not a DXOS process: it has no definition, no inputs
 * of its own and no place in the process manager.
 */
export interface Job {
  readonly id: string;
  /** The job's output from `from` until it ends; a reader that reconnects passes what it already read. */
  output(from?: JobOffsets): Stream.Stream<JobEvent, SandboxError>;
  /** Appends `data` to the job's stdin; writes land in the order they are made. */
  write(data: string): Effect.Effect<void, SandboxError>;
  state(): Effect.Effect<JobState, SandboxError>;
  /** Signals the job, `SIGTERM` by default; a job that already ended is left as it is. */
  terminate(signal?: JobSignal): Effect.Effect<JobState, SandboxError>;
}

/**
 * Runs sandboxes: EDGE's container service, or processes on this machine confined by the OS
 * sandbox. Operation handlers depend on this rather than a transport so either can serve them.
 */
export interface Backend {
  readonly kind: 'edge' | 'local';
  create(spaceId: string, sandboxId: string, options?: CreateOptions): Effect.Effect<SandboxRecord, SandboxError>;
  exec(spaceId: string, sandboxId: string, request: ExecRequest): Effect.Effect<ExecResult, SandboxError>;
  readFileBytes(
    spaceId: string,
    sandboxId: string,
    path: string,
  ): Effect.Effect<{ bytes: Uint8Array; type: string }, SandboxError>;
  writeFile(spaceId: string, sandboxId: string, path: string, content: Uint8Array): Effect.Effect<void, SandboxError>;
  listFiles(spaceId: string, sandboxId: string, path: string): Effect.Effect<readonly FileEntry[], SandboxError>;
  /** Publishes `port` at a URL anyone holding it can load, with no credentials; local sandboxes cannot. */
  exposePort(
    spaceId: string,
    sandboxId: string,
    port: number,
    options?: ExposePortOptions,
  ): Effect.Effect<ExposedPort, SandboxError>;
  /**
   * Replaces the repositories attached to the sandbox: each is a git remote, named as given, in every
   * later command. Only EDGE sandboxes can reach a repository; absent on every other backend.
   */
  setRepositories?(
    spaceId: string,
    sandboxId: string,
    repositories: readonly AttachedRepository[],
  ): Effect.Effect<SandboxRecord, SandboxError>;
  /** Starts `command` as a {@link Job}. Only EDGE sandboxes can; absent on every other backend. */
  startJob?(spaceId: string, sandboxId: string, request: JobRequest): Effect.Effect<Job, SandboxError>;
  /** The handle of a job started earlier, by its id; it does not check that the job still exists. */
  job?(spaceId: string, sandboxId: string, jobId: string): Job;
  /**
   * Serves a directory of the sandbox read-only over HTTP on this machine and answers its base URL,
   * ending in `/`. Only the desktop app's helper can; absent on every other backend.
   */
  publish?(spaceId: string, sandboxId: string, path: string): Effect.Effect<string, SandboxError>;
}

/** The sandbox backend, contributed to the process runtime by the plugin's layer spec. */
export class Service extends Context.Service<Service, Backend>()('org.dxos.plugin.sandbox.SandboxService') {}
