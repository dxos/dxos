//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as HttpClientRequest from 'effect/http/HttpClientRequest';
import * as Schema from 'effect/Schema';

import { type AuthHeaderProvider, type RequestEffect, send } from './SandboxClient.ts';

export const RepositoryRecord = Schema.Struct({
  id: Schema.String,
  spaceId: Schema.String,
  description: Schema.optional(Schema.String),
  defaultBranch: Schema.String,
  remote: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  lastPushAt: Schema.optional(Schema.String),
});
export type RepositoryRecord = Schema.Schema.Type<typeof RepositoryRecord>;

export const BranchInfo = Schema.Struct({
  name: Schema.String,
  commit: Schema.String,
});
export type BranchInfo = Schema.Schema.Type<typeof BranchInfo>;

export const Branches = Schema.Struct({
  defaultBranch: Schema.String,
  branches: Schema.Array(BranchInfo),
});
export type Branches = Schema.Schema.Type<typeof Branches>;

export const CommitPerson = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
  timestamp: Schema.String,
});

export const CommitInfo = Schema.Struct({
  hash: Schema.String,
  message: Schema.String,
  author: CommitPerson,
  committer: CommitPerson,
  parents: Schema.Array(Schema.String),
  tree: Schema.String,
});
export type CommitInfo = Schema.Schema.Type<typeof CommitInfo>;

export const TreeEntry = Schema.Struct({
  name: Schema.String,
  path: Schema.String,
  type: Schema.Literals(['file', 'directory', 'submodule', 'symlink']),
  hash: Schema.String,
  mode: Schema.String,
});
export type TreeEntry = Schema.Schema.Type<typeof TreeEntry>;

export const Tree = Schema.Struct({
  commit: Schema.optional(Schema.String),
  entries: Schema.Array(TreeEntry),
});
export type Tree = Schema.Schema.Type<typeof Tree>;

export const RepositoryFile = Schema.Struct({
  path: Schema.String,
  hash: Schema.String,
  content: Schema.String,
  encoding: Schema.Literals(['utf-8', 'base64']),
  size: Schema.Number,
});
export type RepositoryFile = Schema.Schema.Type<typeof RepositoryFile>;

export type CreateRepositoryOptions = { description?: string; defaultBranch?: string };

/** Reads walk an in-memory clone on EDGE; the first after a push fetches, which bounds these. */
const READ_TIMEOUT = Duration.seconds(60);

/**
 * Client for the repository routes of sandbox-service: repositories backed by Cloudflare Artifacts.
 * A sandbox reaches a repository with plain git, as a remote attached to it (see
 * `SandboxClient.setRepositories`); nothing here pushes or pulls.
 *
 * Shares {@link SandboxClient}'s base URL and credential: both are routes of the same worker, gated
 * by the same space membership.
 */
export class RepositoryClient {
  constructor(
    private readonly _base: string,
    private readonly _authHeader: AuthHeaderProvider,
  ) {}

  #url(spaceId: string, repositoryId: string, path = ''): string {
    return `${this._base.replace(/\/$/, '')}/spaces/${spaceId}/repositories/${repositoryId}${path}`;
  }

  createRepository(
    spaceId: string,
    repositoryId: string,
    options: CreateRepositoryOptions = {},
  ): RequestEffect<RepositoryRecord> {
    return send(
      HttpClientRequest.put(this.#url(spaceId, repositoryId)),
      options,
      envelope(RepositoryRecord),
      READ_TIMEOUT,
      this._authHeader,
      { checkStatus: true },
    ).pipe(Effect.map((body) => body.data));
  }

  getRepository(spaceId: string, repositoryId: string): RequestEffect<RepositoryRecord> {
    return this.#get(spaceId, repositoryId, '', {}, RepositoryRecord);
  }

  deleteRepository(spaceId: string, repositoryId: string): RequestEffect<void> {
    return send(
      HttpClientRequest.delete(this.#url(spaceId, repositoryId)),
      undefined,
      envelope(Schema.Struct({})),
      READ_TIMEOUT,
      this._authHeader,
      { checkStatus: true },
    ).pipe(Effect.asVoid);
  }

  listBranches(spaceId: string, repositoryId: string): RequestEffect<Branches> {
    return this.#get(spaceId, repositoryId, '/branches', {}, Branches);
  }

  log(
    spaceId: string,
    repositoryId: string,
    options: { ref?: string; limit?: number; offset?: number } = {},
  ): RequestEffect<readonly CommitInfo[]> {
    return this.#get(
      spaceId,
      repositoryId,
      '/log',
      compact({ ref: options.ref, limit: options.limit?.toString(), offset: options.offset?.toString() }),
      Schema.Struct({ commits: Schema.Array(CommitInfo) }),
    ).pipe(Effect.map((body) => body.commits));
  }

  readCommit(spaceId: string, repositoryId: string, hash: string): RequestEffect<CommitInfo> {
    return this.#get(spaceId, repositoryId, `/commits/${hash}`, {}, CommitInfo);
  }

  readTree(spaceId: string, repositoryId: string, options: { ref?: string; path?: string } = {}): RequestEffect<Tree> {
    return this.#get(spaceId, repositoryId, '/tree', compact(options), Tree);
  }

  readFile(
    spaceId: string,
    repositoryId: string,
    options: { ref?: string; path: string },
  ): RequestEffect<RepositoryFile> {
    return this.#get(spaceId, repositoryId, '/files', compact(options), RepositoryFile);
  }

  #get<T>(
    spaceId: string,
    repositoryId: string,
    path: string,
    params: Record<string, string>,
    schema: Schema.Codec<T>,
  ): RequestEffect<T> {
    return send(
      HttpClientRequest.get(this.#url(spaceId, repositoryId, path)).pipe(HttpClientRequest.setUrlParams(params)),
      undefined,
      envelope(schema),
      READ_TIMEOUT,
      this._authHeader,
      { checkStatus: true },
    ).pipe(Effect.map((body) => body.data));
  }
}

/** The `EdgeResponse` success envelope every repository route answers with. */
const envelope = <T>(data: Schema.Codec<T>) => Schema.Struct({ success: Schema.Literal(true), data });

const compact = (params: Record<string, string | undefined>): Record<string, string> =>
  Object.fromEntries(Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined));
