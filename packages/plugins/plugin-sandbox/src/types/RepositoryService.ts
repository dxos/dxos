//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

import { BaseError } from '@dxos/errors';

import type {
  Branches,
  CommitInfo,
  CreateRepositoryOptions,
  PushOptions,
  RepositoryFile,
  RepositoryRecord,
  SyncOptions,
  SyncResult,
  Tree,
} from '../services/RepositoryClient.ts';

/** A repository request that could not be carried out. */
export class RepositoryError extends BaseError.extend('RepositoryError', 'Repository request failed.') {}

/**
 * Git repositories hosted by EDGE (Cloudflare Artifacts), and the push and pull between them and a
 * sandbox. Unlike a sandbox, a repository is durable: it is where a sandbox's work is kept.
 *
 * Reads create the remote repository on first use, so an object made on another device, or before
 * the service could be reached, is backed as soon as anything looks at it.
 */
export interface Backend {
  create(
    spaceId: string,
    repositoryId: string,
    options?: CreateRepositoryOptions,
  ): Effect.Effect<RepositoryRecord, RepositoryError>;
  get(spaceId: string, repositoryId: string): Effect.Effect<RepositoryRecord, RepositoryError>;
  delete(spaceId: string, repositoryId: string): Effect.Effect<void, RepositoryError>;
  branches(spaceId: string, repositoryId: string): Effect.Effect<Branches, RepositoryError>;
  log(
    spaceId: string,
    repositoryId: string,
    options?: { ref?: string; limit?: number; offset?: number },
  ): Effect.Effect<readonly CommitInfo[], RepositoryError>;
  tree(
    spaceId: string,
    repositoryId: string,
    options?: { ref?: string; path?: string },
  ): Effect.Effect<Tree, RepositoryError>;
  readFile(
    spaceId: string,
    repositoryId: string,
    options: { ref?: string; path: string },
  ): Effect.Effect<RepositoryFile, RepositoryError>;
  /** Commits a sandbox directory and pushes it to a branch of the repository. */
  push(spaceId: string, sandboxId: string, options: PushOptions): Effect.Effect<SyncResult, RepositoryError>;
  /** Checks a branch of the repository out into a sandbox directory, or fast-forwards it. */
  pull(spaceId: string, sandboxId: string, options: SyncOptions): Effect.Effect<SyncResult, RepositoryError>;
}

/** The repository backend, contributed to the process runtime by the plugin's layer spec. */
export class Service extends Context.Service<Service, Backend>()('org.dxos.plugin.sandbox.RepositoryService') {}
