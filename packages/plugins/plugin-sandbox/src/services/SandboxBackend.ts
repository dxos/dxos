//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import type * as Effect from 'effect/Effect';

import { type ExecRequest, type ExecResult, type FileEntry, type SandboxRecord } from './SandboxClient.ts';

/**
 * A sandbox request that could not be carried out — the backend failed, not the command: a command
 * exiting non-zero is an {@link ExecResult}, never this.
 */
export class SandboxError extends Data.TaggedError('SandboxError')<{ message: string; cause?: unknown }> {}

export type CreateSandboxOptions = { name?: string; baseImage?: string; expiresIn?: number };

/**
 * Where sandboxes run: EDGE's container service, or processes on this machine confined by the OS
 * sandbox. The operation handlers are written against this rather than a transport so either can
 * serve them.
 */
export interface SandboxBackend {
  readonly kind: 'edge' | 'local';
  create(
    spaceId: string,
    sandboxId: string,
    options?: CreateSandboxOptions,
  ): Effect.Effect<SandboxRecord, SandboxError>;
  exec(spaceId: string, sandboxId: string, request: ExecRequest): Effect.Effect<ExecResult, SandboxError>;
  readFileBytes(
    spaceId: string,
    sandboxId: string,
    path: string,
  ): Effect.Effect<{ bytes: Uint8Array; type: string }, SandboxError>;
  writeFile(spaceId: string, sandboxId: string, path: string, content: Uint8Array): Effect.Effect<void, SandboxError>;
  listFiles(spaceId: string, sandboxId: string, path: string): Effect.Effect<readonly FileEntry[], SandboxError>;
}
