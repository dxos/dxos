//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';

import { BaseError } from '@dxos/errors';

/** Raised when an operating-system process cannot be started. */
export class ShellError extends BaseError.extend('ShellError', 'Shell command failed to start') {}

export type SpawnOptions = {
  /** Executable to run, resolved against `PATH` when not a path. */
  readonly command: string;
  readonly args?: readonly string[];
  /** Working directory; the host's own when unset. */
  readonly cwd?: string;
  /** Added to the host's environment, overriding what it already has. */
  readonly env?: Readonly<Record<string, string>>;
};

export type ExecOptions = Omit<SpawnOptions, 'command' | 'args'> & {
  /** A bash script, run as `bash -c <script>`. */
  readonly script: string;
};

export type ExecResult = {
  /** `null` when a signal ended the command. */
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
};

/** A running operating-system process and its standard streams. */
export interface Child {
  readonly pid: number | undefined;
  readonly stdin: WritableStream<Uint8Array>;
  readonly stdout: ReadableStream<Uint8Array>;
  readonly stderr: ReadableStream<Uint8Array>;
  /** Completes with the exit code once the process exits; `null` when a signal ended it. */
  readonly exited: Effect.Effect<number | null>;
  /** Ends the process; a process that already exited is left as it is. */
  readonly kill: Effect.Effect<void>;
}

export interface Service {
  /**
   * Starts `options.command` as an operating-system process. It is killed when the scope closes or
   * when the compute process that owns this service ends, whichever comes first.
   */
  spawn(options: SpawnOptions): Effect.Effect<Child, ShellError, Scope.Scope>;
  /** Runs a bash script to completion and collects its output. */
  exec(options: ExecOptions): Effect.Effect<ExecResult, ShellError>;
}

/**
 * Runs operating-system processes and bash commands for a compute process. Each compute process gets
 * its own instance (process affinity), so nothing it started outlives it. Only a host that can start
 * one provides it (the desktop app, the vite dev server, a CLI); a process that requires it runs nowhere else.
 */
export class ShellService extends Context.Service<ShellService, Service>()('@dxos/compute/ShellService') {}

export const spawn = (options: SpawnOptions): Effect.Effect<Child, ShellError, ShellService | Scope.Scope> =>
  ShellService.use((service) => service.spawn(options));

export const exec = (options: ExecOptions): Effect.Effect<ExecResult, ShellError, ShellService> =>
  ShellService.use((service) => service.exec(options));
