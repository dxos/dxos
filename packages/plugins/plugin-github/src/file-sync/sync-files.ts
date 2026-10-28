//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref, URI } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Repo } from '@dxos/types';

import { GITHUB_SOURCE } from '../constants.ts';
import { GitHubFileObjectMissingError, GitHubRepoUnresolvedError, formatGitHubSyncFailure } from '../errors.ts';
import { GitHubApi } from '../services/index.ts';
import type * as GitHubCapabilities from '../types/GitHubCapabilities.ts';
import { globMatcher } from './glob.ts';

//
// Two-way sync of repository files with ECHO objects (spec/FILE-SYNC.mdl).
//
// A file binding is its own `Cursor` on the bound `Repo`, told apart by `options.stream: 'files'`.
// `token` is the last read-branch commit fully synced. Snapshots hold one `FileMarker` per file
// (`file:<path>`), its version history (`history:<path>`), and the binding's write state (`state`).
//
// A pass reads the read branch's head (one request, 304 when unchanged), pulls the files a mapping
// claims that changed since `token`, then exports every bound object and commits the ones whose
// content differs from what GitHub holds to the write branch, which has one pull request into the
// read branch. Every state change lands on the binding in one `Obj.update` at the end of the pass.
//

/** `Cursor.spec.options` of a file binding. */
export type FileSyncOptions = {
  readonly stream: 'files';
  /** Branch read from. */
  readonly branch: string;
  /** Branch written to; `composer/<spaceId>` when absent. Never equal to `branch`. */
  readonly writeBranch?: string;
  /** FileMapping ids to run; every contributed mapping when absent. */
  readonly mappings?: readonly string[];
  /** Extra globs that narrow every mapping. */
  readonly paths?: readonly string[];
};

/** Sync state of one file, at `snapshots["file:<path>"]`. */
export type FileMarker = {
  readonly mapping: string;
  readonly path: string;
  /** Blob SHA on the read branch last synced. */
  readonly blob: string;
  /** Read-branch commit the blob was read from. */
  readonly commit: string;
  /** The object's heads at which it held exactly `blob` (opaque to the engine; the mapping reads them). */
  readonly heads: readonly string[];
  /** URI of the bound object. */
  readonly object: string;
  /** What this space last committed to the write branch for the file, until the read branch carries it. */
  readonly pushed?: { readonly blob: string; readonly heads: readonly string[]; readonly commit: string };
};

/** One synced version: a commit and the object heads that hold the same content. */
export type VersionLink = {
  readonly commit: string;
  readonly heads: readonly string[];
  readonly at: string;
  readonly direction: 'pull' | 'push';
};

/** Binding-wide write state, at `snapshots.state`. */
export type WriteState = {
  readonly headEtag?: string;
  /** The newest commit this space wrote to the write branch. */
  readonly lastWritten?: string;
  /** The read-branch head the write branch last merged in. */
  readonly mergedHead?: string;
  readonly pullRequest?: { readonly number: number; readonly url: string };
};

/** What one pass did. */
export type FileSyncResult = {
  readonly requests: number;
  readonly pulled: number;
  readonly pushed: number;
  readonly skipped: readonly { readonly path: string; readonly reason: string }[];
  readonly pullRequest?: { readonly number: number; readonly url: string };
};

export const isFileBinding = (binding: Cursor.ExternalCursor): boolean => binding.spec.options?.stream === 'files';

const STATE_KEY = 'state';
const markerKey = (path: string) => `file:${path}`;
const historyKey = (path: string) => `history:${path}`;
const HISTORY_LIMIT = 50;
const DEFAULT_MAX_BYTES = 1024 * 1024;
const MAX_PUSH_ATTEMPTS = 3;

/** The foreign key a mapped object carries, so a rename re-keys it rather than duplicating it. */
export const fileKey = (repoId: string, path: string) => ({ source: GITHUB_SOURCE, id: `${repoId}:${path}` });

const readOptions = (binding: Cursor.ExternalCursor): FileSyncOptions => {
  const options = binding.spec.options ?? {};
  return {
    stream: 'files',
    branch: typeof options.branch === 'string' ? options.branch : 'main',
    writeBranch: typeof options.writeBranch === 'string' ? options.writeBranch : undefined,
    mappings: Array.isArray(options.mappings) ? options.mappings.filter((id) => typeof id === 'string') : undefined,
    paths: Array.isArray(options.paths) ? options.paths.filter((glob) => typeof glob === 'string') : undefined,
  };
};

/** Every marker on the binding, by path. */
const readMarkers = (binding: Cursor.ExternalCursor): Map<string, FileMarker> => {
  const markers = new Map<string, FileMarker>();
  for (const [key, value] of Object.entries(binding.spec.snapshots ?? {})) {
    if (key.startsWith('file:')) {
      const marker = value as FileMarker;
      markers.set(marker.path, marker);
    }
  }
  return markers;
};

type Change =
  | { readonly kind: 'added' | 'modified'; readonly path: string; readonly blob: string; readonly size?: number }
  | { readonly kind: 'removed'; readonly path: string }
  | { readonly kind: 'renamed'; readonly from: string; readonly path: string; readonly blob: string };

/** A tree diff, pairing a removed and an added path with one blob SHA as a rename (D-7). */
const diffTrees = (before: readonly GitHubApi.TreeEntry[], after: readonly GitHubApi.TreeEntry[]): Change[] => {
  const old = new Map(before.map((entry) => [entry.path, entry]));
  const next = new Map(after.map((entry) => [entry.path, entry]));
  const added: GitHubApi.TreeEntry[] = [];
  const changes: Change[] = [];
  for (const entry of after) {
    const previous = old.get(entry.path);
    if (!previous) {
      added.push(entry);
    } else if (previous.sha !== entry.sha) {
      changes.push({ kind: 'modified', path: entry.path, blob: entry.sha, size: entry.size });
    }
  }
  const removed = before.filter((entry) => !next.has(entry.path));
  for (const entry of added) {
    const index = removed.findIndex((candidate) => candidate.sha === entry.sha);
    if (index >= 0) {
      changes.push({ kind: 'renamed', from: removed[index].path, path: entry.path, blob: entry.sha });
      removed.splice(index, 1);
    } else {
      changes.push({ kind: 'added', path: entry.path, blob: entry.sha, size: entry.size });
    }
  }
  for (const entry of removed) {
    changes.push({ kind: 'removed', path: entry.path });
  }
  return changes;
};

const fromCompare = (files: readonly GitHubApi.CompareFile[]): Change[] =>
  files.flatMap((file): Change[] => {
    switch (file.status) {
      case 'removed':
        return [{ kind: 'removed', path: file.filename }];
      case 'renamed':
        return file.previous_filename && file.sha
          ? [{ kind: 'renamed', from: file.previous_filename, path: file.filename, blob: file.sha }]
          : [];
      case 'added':
      case 'copied':
        return file.sha ? [{ kind: 'added', path: file.filename, blob: file.sha }] : [];
      default:
        return file.sha ? [{ kind: 'modified', path: file.filename, blob: file.sha }] : [];
    }
  });

/** Removes one foreign key, leaving the object's other keys. */
const dropKey = (object: Obj.Unknown, key: { source: string; id: string }) =>
  Obj.update(object, (object) => {
    const keys = Obj.getMeta(object).keys;
    const index = keys.findIndex((entry) => entry.source === key.source && entry.id === key.id);
    if (index >= 0) {
      keys.splice(index, 1);
    }
  });

/** The object a marker binds; a marker whose object is gone fails the file, not the pass. */
const resolveBound = (uri: string) =>
  Database.resolve(URI.make(uri)).pipe(
    Effect.flatMap((entity) =>
      Obj.isObject(entity)
        ? Effect.succeed(entity)
        : Effect.fail(new GitHubFileObjectMissingError({ context: { uri } })),
    ),
  );

const addKey = (object: Obj.Unknown, key: { source: string; id: string }) =>
  Obj.update(object, (object) => {
    const keys = Obj.getMeta(object).keys;
    if (!keys.some((entry) => entry.source === key.source && entry.id === key.id)) {
      keys.push(key);
    }
  });

/**
 * One pass over a file binding (spec/FILE-SYNC.mdl F-2 to F-5) with the contributed `mappings`.
 * Stamps success or failure onto the binding.
 */
export const syncFileBinding = Effect.fn('syncFileBinding')(function* (
  binding: Cursor.ExternalCursor,
  contributed: readonly GitHubCapabilities.FileMapping[],
) {
  const target = yield* Database.load(binding.spec.target);
  const db = Obj.getDatabase(binding) ?? Obj.getDatabase(target);
  const repo = Obj.instanceOf(Repo.Repo, target) ? target : undefined;
  const repoId = binding.spec.externalId ?? Obj.getMeta(target).keys.find((key) => key.source === GITHUB_SOURCE)?.id;

  const outcome = yield* Effect.result(
    Effect.gen(function* () {
      if (!repo || !repoId || !db) {
        return yield* Effect.fail(new GitHubRepoUnresolvedError());
      }
      const options = readOptions(binding);
      const writeBranch = options.writeBranch ?? `composer/${db.spaceId}`;
      const mappings = contributed.filter((mapping) => !options.mappings || options.mappings.includes(mapping.id));
      const mappingById = new Map(mappings.map((mapping) => [mapping.id, mapping]));
      const pathFilter = options.paths ? globMatcher(options.paths) : undefined;
      const matchers = mappings.map((mapping) => ({ mapping, matches: globMatcher(mapping.match) }));
      const conflicts = new Set<string>();
      /** The first contributed mapping that claims `path` (F-1.2). */
      const mappingFor = (path: string): GitHubCapabilities.FileMapping | undefined => {
        if (pathFilter && !pathFilter(path)) {
          return undefined;
        }
        const claiming = matchers.filter(({ matches }) => matches(path)).map(({ mapping }) => mapping);
        if (claiming.length > 1 && !conflicts.has(path)) {
          conflicts.add(path);
          log.warn('github file sync: several mappings claim a path; the first wins', {
            path,
            mappings: claiming.map((mapping) => mapping.id),
          });
        }
        return claiming[0];
      };

      const { owner, name } = repo;
      const state: WriteState = Cursor.readSnapshot<WriteState>(binding, STATE_KEY) ?? {};
      const markers = readMarkers(binding);
      /** Snapshot writes, applied together at the end of the pass; `undefined` deletes. */
      const writes = new Map<string, unknown>();
      const history = new Map<string, VersionLink[]>();
      const now = new Date().toISOString();
      const appendHistory = (path: string, link: Omit<VersionLink, 'at'>) => {
        const links = history.get(path) ?? [...(Cursor.readSnapshot<VersionLink[]>(binding, historyKey(path)) ?? [])];
        links.push({ ...link, at: now });
        history.set(path, links.slice(-HISTORY_LIMIT));
      };
      const setMarker = (marker: FileMarker) => {
        markers.set(marker.path, marker);
        writes.set(markerKey(marker.path), marker);
      };
      const deleteMarker = (path: string) => {
        markers.delete(path);
        writes.set(markerKey(path), undefined);
      };
      const skipped: { path: string; reason: string }[] = [];
      let requests = 0;
      let pulled = 0;

      // F-2.1: the read branch's head, conditional on the last ETag.
      const headResult = yield* GitHubApi.fetchBranchHead(owner, name, options.branch, state.headEtag);
      requests++;
      if (headResult.status === 'missing') {
        return yield* Effect.fail(new GitHubRepoUnresolvedError({ context: { branch: options.branch } }));
      }
      const token = Cursor.readToken(binding);
      const head = headResult.status === 'ok' ? headResult.value.sha : token;
      const headEtag = headResult.status === 'ok' ? headResult.etag : state.headEtag;
      if (!head) {
        // A 304 without a token: the stored ETag outlived its token, so read the head again unconditionally.
        writes.set(STATE_KEY, { ...state, headEtag: undefined });
        return { result: { requests, pulled, pushed: 0, skipped }, token, writes, history };
      }

      // F-2.2: while a write branch exists, its tip tells whether a person committed to it.
      let writeTip: string | undefined;
      if (state.lastWritten) {
        const tip = yield* GitHubApi.fetchBranchHead(owner, name, writeBranch);
        requests++;
        writeTip = tip.status === 'ok' ? tip.value.sha : undefined;
      }

      // F-2.3: what changed on the read branch since the token.
      if (head !== token) {
        let changes: Change[];
        // Whether the read branch now carries what this space pushed (its pull request merged).
        let merged = false;
        if (!token) {
          const tree = yield* GitHubApi.fetchTree(owner, name, head);
          requests++;
          changes = tree.blobs.map((entry) => ({ kind: 'added', path: entry.path, blob: entry.sha, size: entry.size }));
        } else {
          const comparison = yield* GitHubApi.compareCommits(owner, name, token, head);
          requests++;
          if (comparison.truncated) {
            const [before, after] = yield* Effect.all([
              GitHubApi.fetchTree(owner, name, token),
              GitHubApi.fetchTree(owner, name, head),
            ]);
            requests += 2;
            changes = diffTrees(before.blobs, after.blobs);
          } else {
            changes = fromCompare(comparison.files);
          }
          if (state.lastWritten) {
            const pushedComparison = yield* GitHubApi.compareCommits(owner, name, state.lastWritten, head);
            requests++;
            merged = pushedComparison.status === 'ahead' || pushedComparison.status === 'identical';
          }
        }

        /** Pulls one change; true when an object was created or changed. */
        const pullChange = (change: Change) =>
          Effect.gen(function* () {
            const previous = change.kind === 'renamed' ? markers.get(change.from) : markers.get(change.path);
            if (change.kind === 'removed') {
              // F-3.4: drop the marker and the key; the object stays.
              if (previous) {
                const object = yield* resolveBound(previous.object);
                dropKey(object, fileKey(repoId, previous.path));
                deleteMarker(previous.path);
                return true;
              }
              return false;
            }
            const mapping = mappingFor(change.path);
            if (!mapping) {
              // A tracked file renamed out of every mapping is released as a removal would be.
              if (previous && change.kind === 'renamed') {
                const object = yield* resolveBound(previous.object);
                dropKey(object, fileKey(repoId, previous.path));
                deleteMarker(previous.path);
              }
              return false;
            }
            const maxBytes = mapping.maxBytes ?? DEFAULT_MAX_BYTES;
            if (change.kind !== 'renamed' && change.size !== undefined && change.size > maxBytes) {
              skipped.push({ path: change.path, reason: `larger than ${maxBytes} bytes` });
              return false;
            }

            if (previous && change.kind === 'renamed') {
              // F-3.3: move the key and the marker; the content change, if any, is applied below.
              const object = yield* resolveBound(previous.object);
              dropKey(object, fileKey(repoId, previous.path));
              addKey(object, fileKey(repoId, change.path));
              deleteMarker(previous.path);
              setMarker({ ...previous, path: change.path });
            }
            const marker = markers.get(change.path);
            if (marker && marker.blob === change.blob) {
              setMarker({ ...marker, commit: head });
              return change.kind === 'renamed';
            }

            const content = yield* GitHubApi.fetchBlob(owner, name, change.blob);
            requests++;
            if (new TextEncoder().encode(content).byteLength > maxBytes) {
              skipped.push({ path: change.path, reason: `larger than ${maxBytes} bytes` });
              return false;
            }

            if (!marker) {
              // F-3.1: a new file, or one a mapping claims for the first time.
              const imported = yield* Operation.invoke(mapping.import, {
                repository: Ref.make(repo),
                path: change.path,
                content,
              });
              const object = yield* Database.load(imported.object);
              addKey(object, fileKey(repoId, change.path));
              setMarker({
                mapping: mapping.id,
                path: change.path,
                blob: change.blob,
                commit: head,
                heads: imported.heads,
                object: Obj.getURI(object),
              });
              appendHistory(change.path, { commit: head, heads: imported.heads, direction: 'pull' });
              return true;
            }

            if (marker.pushed?.blob === change.blob) {
              // The read branch took exactly what this space pushed: the object already holds it.
              setMarker({ ...marker, blob: change.blob, commit: head, heads: marker.pushed.heads, pushed: undefined });
              return false;
            }

            // F-3.2: apply base → content as of the heads the base was synced at. Once the pull request
            // merged, the base is what this space pushed, so its own edits are not applied a second time.
            const fromPushed = merged ? marker.pushed : undefined;
            const baseBlob = fromPushed?.blob ?? marker.blob;
            const baseHeads = fromPushed?.heads ?? marker.heads;
            const base = yield* GitHubApi.fetchBlob(owner, name, baseBlob);
            requests++;
            const imported = yield* Operation.invoke(mapping.import, {
              repository: Ref.make(repo),
              path: change.path,
              content,
              base,
              object: Ref.make(yield* resolveBound(marker.object)),
              heads: baseHeads,
            });
            setMarker({
              ...marker,
              mapping: mapping.id,
              blob: change.blob,
              commit: head,
              heads: imported.heads,
              pushed: fromPushed ? undefined : marker.pushed,
            });
            appendHistory(change.path, { commit: head, heads: imported.heads, direction: 'pull' });
            return true;
          });

        for (const change of changes) {
          const outcome = yield* pullChange(change).pipe(
            Effect.catchCause((cause) => {
              log.warn('github file sync: pull failed', { path: change.path, cause });
              skipped.push({ path: change.path, reason: 'import failed' });
              return Effect.succeed(false);
            }),
          );
          if (outcome) {
            pulled++;
          }
        }
      }

      // F-4: export every bound object that has an export, and push what differs from GitHub.
      const exports: { marker: FileMarker; content: string; blob: string; heads: readonly string[] }[] = [];
      for (const marker of markers.values()) {
        const mapping = mappingById.get(marker.mapping);
        if (!mapping?.export) {
          continue;
        }
        const exported = mapping.export;
        const rendered = yield* resolveBound(marker.object).pipe(
          Effect.flatMap((object) => Operation.invoke(exported, { object: Ref.make(object), path: marker.path })),
          Effect.catchCause((cause) => {
            log.warn('github file sync: export failed', { path: marker.path, cause });
            skipped.push({ path: marker.path, reason: 'export failed' });
            return Effect.succeed(undefined);
          }),
        );
        if (!rendered) {
          continue;
        }
        const blob = yield* GitHubApi.gitBlobSha(rendered.content);
        if (blob !== (marker.pushed?.blob ?? marker.blob)) {
          exports.push({ marker, content: rendered.content, blob, heads: rendered.heads });
        }
      }

      let pushed = 0;
      let pullRequest = state.pullRequest;
      let nextState: WriteState = { ...state, headEtag };
      // F-4.6 is not implemented: a commit on the write branch this space did not write holds the push back.
      const foreignTip = state.lastWritten !== undefined && writeTip !== undefined && writeTip !== state.lastWritten;
      if (exports.length > 0 && foreignTip) {
        for (const entry of exports) {
          skipped.push({ path: entry.marker.path, reason: `${writeBranch} has commits this space did not write` });
        }
      } else if (exports.length > 0) {
        // F-4.2: the read head's tree, plus every export that differs from the read head.
        const files = exports.map((entry) => ({ path: entry.marker.path, content: entry.content }));
        const carried: { path: string; content: string }[] = [];
        for (const marker of markers.values()) {
          // Edits pushed earlier and not merged yet: the tree starts from the read head, so they ride again.
          if (marker.pushed && !exports.some((entry) => entry.marker.path === marker.path)) {
            carried.push({ path: marker.path, content: yield* GitHubApi.fetchBlob(owner, name, marker.pushed.blob) });
            requests++;
          }
        }
        const baseTree = yield* GitHubApi.fetchCommitTree(owner, name, head);
        requests++;

        let tip = writeTip;
        let commit: string | undefined;
        for (let attempt = 1; commit === undefined; attempt++) {
          const create = tip === undefined;
          const parents =
            tip === undefined ? [head] : tip === head || nextState.mergedHead === head ? [tip] : [tip, head];
          const written = yield* GitHubApi.commitFiles(owner, name, {
            branch: writeBranch,
            parents,
            baseTree,
            message: `Composer: sync ${files.length} file${files.length === 1 ? '' : 's'} from space ${db.spaceId}`,
            files: [...files, ...carried],
            create,
          }).pipe(
            Effect.map((result) => result.commit),
            Effect.catchTag('GitHubRefMovedError', (error) =>
              attempt >= MAX_PUSH_ATTEMPTS ? Effect.fail(error) : Effect.succeed(undefined),
            ),
          );
          requests += 3;
          if (written === undefined) {
            // F-4.3: read the tip again and retry on it.
            const reread = yield* GitHubApi.fetchBranchHead(owner, name, writeBranch);
            requests++;
            tip = reread.status === 'ok' ? reread.value.sha : undefined;
          }
          commit = written;
        }

        for (const entry of exports) {
          setMarker({ ...entry.marker, pushed: { blob: entry.blob, heads: entry.heads, commit } });
          appendHistory(entry.marker.path, { commit, heads: entry.heads, direction: 'push' });
        }
        pushed = exports.length;

        // F-4.4: one open pull request from the write branch into the read branch. The commit has landed,
        // so a failure here must not drop `lastWritten`, or the next pass would take its own commit for a person's.
        const opened = yield* GitHubApi.ensurePullRequest(owner, name, {
          head: writeBranch,
          base: options.branch,
          title: `Composer edits from space ${db.spaceId}`,
          body: `Edits made in Composer to files synced from \`${options.branch}\`. Each sync adds to this branch.`,
        }).pipe(
          Effect.catchCause((cause) => {
            log.warn('github file sync: opening the pull request failed', { writeBranch, cause });
            return Effect.succeed(undefined);
          }),
        );
        pullRequest = opened ?? pullRequest;
        requests += 2;
        nextState = { ...nextState, lastWritten: commit, mergedHead: head, pullRequest };
      }

      // A quiet pass leaves the state as it was, so it adds nothing to the binding's history.
      if (JSON.stringify(nextState) !== JSON.stringify(state)) {
        writes.set(STATE_KEY, nextState);
      }
      return {
        result: { requests, pulled, pushed, skipped, ...(pullRequest ? { pullRequest } : {}) },
        token: head,
        writes,
        history,
      };
    }).pipe(Effect.provide(GitHubApi.fromAccessToken(binding.spec.source))),
  );

  if (outcome._tag === 'Failure') {
    const message = formatGitHubSyncFailure(outcome.failure);
    Cursor.recordError(binding, message);
    log.warn('github file sync: binding failed', { error: outcome.failure });
    return yield* Effect.fail(outcome.failure);
  }

  // F-5.1: the token, every marker and the history advance in one update.
  const { result, token, writes, history } = outcome.success;
  Obj.update(binding, (binding) => {
    if (binding.spec.kind !== 'external') {
      return;
    }
    // Assign first, then read back: the assigned literal is copied into the document, so writes must go through the live record.
    if (binding.spec.snapshots === undefined) {
      binding.spec.snapshots = {};
    }
    const snapshots: Record<string, unknown> = binding.spec.snapshots;
    for (const [key, value] of writes) {
      if (value === undefined) {
        delete snapshots[key];
      } else {
        snapshots[key] = value;
      }
    }
    for (const [path, links] of history) {
      snapshots[historyKey(path)] = links;
    }
    if (token !== undefined) {
      binding.spec.token = token;
    }
    binding.lastTick = new Date().toISOString();
    binding.lastError = undefined;
  });
  return result satisfies FileSyncResult;
}, Effect.provide(FetchHttpClient.layer));
