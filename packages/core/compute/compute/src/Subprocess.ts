//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';

import { BaseError } from '@dxos/errors';

/** Raised when an operating-system process cannot be started. */
export class SubprocessError extends BaseError.extend('SubprocessError', 'Subprocess failed to start') {}

export type SpawnOptions = {
  /** Executable to run, resolved against `PATH` when not a path. */
  readonly command: string;
  readonly args?: readonly string[];
  /** Working directory; the host's own when unset. */
  readonly cwd?: string;
  /** Added to the host's environment, overriding what it already has. */
  readonly env?: Readonly<Record<string, string>>;
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
   * Starts `options.command` as an operating-system process, killed when the scope closes so a
   * process that loses its owner does not outlive it.
   */
  spawn(options: SpawnOptions): Effect.Effect<Child, SubprocessError, Scope.Scope>;
}

/**
 * Lets a process run operating-system processes. Only a host that can start one provides it (a
 * desktop app, a CLI); a process that requires it does not run anywhere else.
 */
export class Subprocess extends Context.Service<Subprocess, Service>()('@dxos/compute/Subprocess') {}

export const spawn = (options: SpawnOptions): Effect.Effect<Child, SubprocessError, Subprocess | Scope.Scope> =>
  Subprocess.use((service) => service.spawn(options));
