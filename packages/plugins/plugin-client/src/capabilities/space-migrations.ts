//
// Copyright 2026 DXOS.org
//

import { type CleanupFn } from '@dxos/async';
import { type Migration } from '@dxos/echo';

/** The part of a space the migration watcher uses. */
export type MigratableSpace = {
  readonly id: string;
  waitUntilReady(): Promise<unknown>;
  readonly internal: {
    readonly db: {
      runMigrations(migrations: Migration.Migration[]): Promise<void>;
      watchFoldForward(getMigrations: () => Migration.Migration[]): CleanupFn;
    };
  };
};

/** The part of the client's space list the migration watcher uses. */
export type MigratableSpaceList = {
  get(): readonly MigratableSpace[];
  subscribe(next: (spaces: readonly MigratableSpace[]) => void): { unsubscribe(): void };
};

export type SpaceMigrationWatcher = {
  /** Re-runs the current migrations on every ready space, after the migration set changed. */
  rerun(): void;
  close(): void;
};

/**
 * Migrates and watches every space once its database is ready, including spaces created or joined
 * after this starts, and stops watching a space when it leaves the list.
 */
export const watchSpaceMigrations = (
  spaces: MigratableSpaceList,
  getMigrations: () => Migration.Migration[],
  onError: (err: unknown) => void,
): SpaceMigrationWatcher => {
  const attached = new Map<string, { space: MigratableSpace; cleanup: CleanupFn }>();
  const pending = new Set<string>();
  let live = new Set<string>();
  let closed = false;

  const migrate = (space: MigratableSpace): void => {
    void space.internal.db.runMigrations(getMigrations()).catch(onError);
  };

  const attach = (space: MigratableSpace): void => {
    if (attached.has(space.id) || pending.has(space.id)) {
      return;
    }
    pending.add(space.id);
    void space.waitUntilReady().then(
      () => {
        pending.delete(space.id);
        // The space may have left the list, or the watcher closed, while it was loading.
        if (closed || !live.has(space.id)) {
          return;
        }
        attached.set(space.id, { space, cleanup: space.internal.db.watchFoldForward(getMigrations) });
        migrate(space);
      },
      (err: unknown) => {
        pending.delete(space.id);
        onError(err);
      },
    );
  };

  const update = (current: readonly MigratableSpace[]): void => {
    live = new Set(current.map((space) => space.id));
    for (const [id, { cleanup }] of attached) {
      if (!live.has(id)) {
        cleanup();
        attached.delete(id);
      }
    }
    current.forEach(attach);
  };

  const subscription = spaces.subscribe(update);
  update(spaces.get());

  return {
    rerun: () => {
      for (const { space } of attached.values()) {
        migrate(space);
      }
    },
    close: () => {
      closed = true;
      subscription.unsubscribe();
      for (const { cleanup } of attached.values()) {
        cleanup();
      }
      attached.clear();
    },
  };
};
