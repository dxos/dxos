//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

import { BaseError } from '@dxos/errors';

import type { ExecRequest, ExecResult, FileEntry, SandboxRecord } from '../services/SandboxClient.ts';

/**
 * A sandbox request that could not be carried out — the backend failed, not the command: a command
 * exiting non-zero is an {@link ExecResult}, never this.
 */
export class SandboxError extends BaseError.extend('SandboxError', 'Sandbox request failed.') {}

export type CreateOptions = { name?: string; baseImage?: string; expiresIn?: number };

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
}

/** The sandbox backend, contributed to the process runtime by the plugin's layer spec. */
export class Service extends Context.Service<Service, Backend>()('org.dxos.plugin.sandbox.SandboxService') {}
