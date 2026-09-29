//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';

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

export const SyncResult = Schema.Struct({
  repository: Schema.String,
  branch: Schema.String,
  commit: Schema.optional(Schema.String),
  success: Schema.Boolean,
  output: Schema.String,
});
export type SyncResult = Schema.Schema.Type<typeof SyncResult>;

export type CreateRepositoryOptions = { description?: string; defaultBranch?: string };

export type SyncOptions = {
  repositoryId: string;
  /** Sandbox directory; the workspace root when omitted. */
  path?: string;
  /** The repository's default branch when omitted. */
  branch?: string;
  timeout?: number;
};

export type PushOptions = SyncOptions & {
  message?: string;
  author?: { name: string; email: string };
  force?: boolean;
};

/** Reads walk an in-memory clone on EDGE; the first after a push fetches, which bounds these. */
const READ_TIMEOUT = Duration.seconds(60);

/** Push and pull run git in the container, bounded server-side by their own `timeout`. */
const SYNC_TIMEOUT = Duration.minutes(5);

/**
 * Client for the repository routes of sandbox-service: repositories backed by Cloudflare Artifacts,
 * and the push and pull that move a sandbox directory into and out of one.
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
      Schema.Struct({ repository: RepositoryRecord }),
      READ_TIMEOUT,
      this._authHeader,
      { checkStatus: true },
    ).pipe(Effect.map((body) => body.repository));
  }

  getRepository(spaceId: string, repositoryId: string): RequestEffect<RepositoryRecord> {
    return this.#get(spaceId, repositoryId, '', {}, Schema.Struct({ repository: RepositoryRecord })).pipe(
      Effect.map((body) => body.repository),
    );
  }

  deleteRepository(spaceId: string, repositoryId: string): RequestEffect<void> {
    return send(
      HttpClientRequest.delete(this.#url(spaceId, repositoryId)),
      undefined,
      Schema.Struct({ success: Schema.Boolean }),
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
    return this.#get(spaceId, repositoryId, `/commits/${hash}`, {}, Schema.Struct({ commit: CommitInfo })).pipe(
      Effect.map((body) => body.commit),
    );
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

  push(spaceId: string, sandboxId: string, options: PushOptions): RequestEffect<SyncResult> {
    return this.#sync(spaceId, sandboxId, 'push', options);
  }

  pull(spaceId: string, sandboxId: string, options: SyncOptions): RequestEffect<SyncResult> {
    return this.#sync(spaceId, sandboxId, 'pull', options);
  }

  #sync(spaceId: string, sandboxId: string, action: 'push' | 'pull', options: SyncOptions): RequestEffect<SyncResult> {
    const timeout = options.timeout ? Duration.millis(options.timeout + 30_000) : SYNC_TIMEOUT;
    return send(
      HttpClientRequest.post(`${this._base.replace(/\/$/, '')}/spaces/${spaceId}/sandboxes/${sandboxId}/${action}`),
      options,
      SyncResult,
      timeout,
      this._authHeader,
      { checkStatus: true },
    );
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
      schema,
      READ_TIMEOUT,
      this._authHeader,
      { checkStatus: true },
    );
  }
}

const compact = (params: Record<string, string | undefined>): Record<string, string> =>
  Object.fromEntries(Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined));
