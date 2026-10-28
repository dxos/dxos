//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { log } from '@dxos/log';
import * as FileSystem from '@dxos/plugin-file-system/FileSystem';
import { type SpecDocument } from '@dxos/types';

import { resolvePath } from './repo-roots.ts';
import { type SourceKey, fromMetaKey, isSpecKey } from './spec-key.ts';

/** What a sync pass did to one spec. */
export type SyncStatus =
  /** ECHO and disk agree. */
  | 'synced'
  /** Disk changed; ECHO took it. */
  | 'pulled'
  /** ECHO changed; disk took it. */
  | 'pushed'
  /** Both changed since the last sync; disk won. */
  | 'conflict'
  /** No local checkout of the key's repository. */
  | 'unresolved'
  /** The checkout has no such file. */
  | 'missing'
  | 'error';

export type Reconciliation = { action: 'none' | 'pull' | 'push'; status: SyncStatus };

/**
 * A three-way decision against the text both sides last agreed on. With no base (first link, or a fresh
 * session) the file wins, since the repository is where specs are reviewed and versioned.
 */
export const reconcile = ({ local, disk, base }: { local: string; disk: string; base?: string }): Reconciliation => {
  if (local === disk) {
    return { action: 'none', status: 'synced' };
  }
  if (base === undefined || local === base) {
    return { action: 'pull', status: 'pulled' };
  }
  if (disk === base) {
    return { action: 'push', status: 'pushed' };
  }
  return { action: 'pull', status: 'conflict' };
};

/** The repository location a spec is linked to, from its meta keys. */
export const getSpecKey = (spec: SpecDocument.SpecDocument): SourceKey | undefined =>
  Obj.getMeta(spec)
    .keys.map(fromMetaKey)
    .find((key) => key !== undefined && isSpecKey(key));

/** The last text ECHO and disk agreed on, per spec id; kept per browser so a reload does not re-pull blindly. */
export class SyncBases {
  readonly #memory = new Map<string, string>();

  get(id: string): Effect.Effect<string | undefined> {
    if (this.#memory.has(id)) {
      return Effect.succeed(this.#memory.get(id));
    }
    return Effect.try(() => globalThis.localStorage?.getItem(`${SYNC_BASE_PREFIX}${id}`)).pipe(
      // Storage can be unavailable (private window); the in-memory base still works for the session.
      Effect.orElseSucceed(() => undefined),
      Effect.map((stored) => {
        stored != null && this.#memory.set(id, stored);
        return this.#memory.get(id);
      }),
    );
  }

  set(id: string, text: string): Effect.Effect<void> {
    this.#memory.set(id, text);
    return Effect.try(() => globalThis.localStorage?.setItem(`${SYNC_BASE_PREFIX}${id}`, text)).pipe(
      Effect.orElseSucceed(() => undefined),
    );
  }
}

const SYNC_BASE_PREFIX = 'org.dxos.plugin.code.sync-base:';

export type SyncResult = { status: SyncStatus; path?: string; error?: string };

/** One sync pass for one spec. */
export const syncSpec = Effect.fnUntraced(
  function* (
    spec: SpecDocument.SpecDocument,
    { fs, roots, bases }: { fs: FileSystem.FileSystem; roots: readonly FileSystem.RepoRoot[]; bases: SyncBases },
  ) {
    const key = getSpecKey(spec);
    const path = key && resolvePath(roots, key);
    if (!path) {
      return { status: 'unresolved' } satisfies SyncResult;
    }
    const text = spec.content.target;
    if (!text) {
      return { status: 'synced', path } satisfies SyncResult;
    }
    const disk = yield* fs.read(path);
    if (disk === undefined) {
      return { status: 'missing', path } satisfies SyncResult;
    }

    const local = text.content;
    const { action, status } = reconcile({ local, disk, base: yield* bases.get(spec.id) });
    if (action === 'pull') {
      Doc.updateText(text, ['content'], disk);
    } else if (action === 'push') {
      yield* fs.write(path, local);
    }
    if (status === 'conflict') {
      log.warn('spec changed in Composer and on disk; disk wins', { path });
    }
    yield* bases.set(spec.id, action === 'push' ? local : disk);
    return { status, path } satisfies SyncResult;
  },
  Effect.catch((error) => Effect.succeed<SyncResult>({ status: 'error', error: error.message })),
);
