//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

import { BaseError } from '@dxos/errors';

import type {
  AttachedRepository,
  ExecRequest,
  ExecResult,
  ExposedPort,
  ExposePortOptions,
  FileEntry,
  SandboxRecord,
  TerminalEndpoint,
  TerminalSize,
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
  /**
   * Where to open the sandbox's interactive shell, which outlives each connection to it. Only EDGE
   * sandboxes have one; absent on every other backend.
   */
  terminal?(spaceId: string, sandboxId: string, size?: TerminalSize): Effect.Effect<TerminalEndpoint, SandboxError>;
  /**
   * Serves a directory of the sandbox read-only over HTTP on this machine and answers its base URL,
   * ending in `/`. Only the desktop app's helper can; absent on every other backend.
   */
  publish?(spaceId: string, sandboxId: string, path: string): Effect.Effect<string, SandboxError>;
}

/** The sandbox backend, contributed to the process runtime by the plugin's layer spec. */
export class Service extends Context.Service<Service, Backend>()('org.dxos.plugin.sandbox.SandboxService') {}
