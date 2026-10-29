//
// Copyright 2026 DXOS.org
//

import type * as Atom from 'effect/reactivity/Atom';

import type * as AppUpdate from '@dxos/app-toolkit/AppUpdate';

export type VersionCheckOptions = {
  status: Atom.Writable<AppUpdate.Status>;
  setStatus: (status: AppUpdate.Status) => void;
  /** Served by the vite dev server. */
  dev: boolean;
  /** The build this page is running, or `undefined` when it cannot be told. */
  current: string | undefined;
  /** The build the server serves now. */
  fetchLatest: () => Promise<string | undefined>;
  /** The build the last reload was for; must survive the reload. */
  reloadedFor: { get: () => string | undefined; set: (build: string) => void };
  reload: () => void;
};

/** The entry script a document loads: its hashed name changes with every build. */
export const entryScript = (document: Pick<Document, 'querySelector'>): string | undefined =>
  document.querySelector('script[type="module"][src]')?.getAttribute('src') ?? undefined;

/** The update manager for a build without a service worker: a newer build is `ready` once seen. */
export const makeVersionCheckManager = ({
  status,
  setStatus,
  dev,
  current,
  fetchLatest,
  reloadedFor,
  reload,
}: VersionCheckOptions): AppUpdate.Manager => {
  let latest: string | undefined;
  return {
    status,
    check: async () => {
      if (dev) {
        setStatus({ kind: 'dev' });
        return;
      }
      if (!current) {
        setStatus({ kind: 'unsupported' });
        return;
      }
      setStatus({ kind: 'checking' });
      try {
        latest = await fetchLatest();
      } catch (error) {
        setStatus({ kind: 'failed', error: error instanceof Error ? error.message : String(error) });
        return;
      }
      if (!latest || latest === current) {
        setStatus({ kind: 'up-to-date', checkedAt: Date.now() });
      } else if (latest === reloadedFor.get()) {
        // A reload for this build already came back with the old one; another would loop.
        setStatus({ kind: 'failed', error: `reloading did not load ${latest}` });
      } else {
        setStatus({ kind: 'ready' });
      }
    },
    apply: async () => {
      if (latest) {
        reloadedFor.set(latest);
      }
      reload();
    },
  };
};
