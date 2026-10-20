//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import { BaseError } from '@dxos/errors';
import { Repo } from '@dxos/types';

import type {
  Branches,
  CommitInfo,
  CreateRepositoryOptions,
  RepositoryFile,
  RepositoryRecord,
  Tree,
} from '../services/RepositoryClient.ts';

/** A repository request that could not be carried out. */
export class RepositoryError extends BaseError.extend('RepositoryError', 'Repository request failed.') {}

/**
 * Git repositories hosted by EDGE (Cloudflare Artifacts). Unlike a sandbox, a repository is durable:
 * it is where a sandbox's work is kept, pushed with plain git from a sandbox it is attached to.
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
}

/** The repository backend, contributed to the process runtime by the plugin's layer spec. */
export class Service extends Context.Service<Service, Backend>()('org.dxos.plugin.sandbox.RepositoryService') {}

/** The id EDGE knows the repository by; a repository hosted elsewhere (GitHub) has none to use here. */
export const edgeIdOf = (repository: Repo.Repo): Effect.Effect<string, RepositoryError> => {
  const id = Repo.edgeId(repository);
  return id
    ? Effect.succeed(id)
    : Effect.fail(new RepositoryError({ message: `Repository ${Repo.fullName(repository)} is not hosted by EDGE.` }));
};
