//
// Copyright 2024 DXOS.org
//

import { type CleanupFn } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { type EchoDatabase } from '@dxos/echo-client';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

export const createClientSaveTracker = (client: Client, cb: (state: 'saved' | 'saving') => void) => {
  const CleanupFns: Record<SpaceId, CleanupFn> = {};
  const state: Record<SpaceId, 'saved' | 'saving'> = {};

  const install = (spaces: Space[]) => {
    for (const space of spaces) {
      if (state[space.id]) {
        continue;
      }

      state[space.id] = 'saved';
      CleanupFns[space.id] = createSpaceSaveTracker(space, (s) => {
        state[space.id] = s;
        cb(Object.values(state).some((s) => s === 'saving') ? 'saving' : 'saved');
      });
    }
  };
  client.spaces.subscribe((spaces) => {
    install(spaces);
  });
  install(client.spaces.get());

  return () => {
    for (const unsubscribe of Object.values(CleanupFns)) {
      unsubscribe();
    }
  };
};

/** The part of a {@link Space} the save tracker reads. */
export type SaveTrackedSpace = {
  readonly db: Pick<EchoDatabase, 'saveStateChanged' | 'flush'>;
  waitUntilReady(): Promise<unknown>;
};

export const createSpaceSaveTracker = (space: SaveTrackedSpace, cb: (state: 'saved' | 'saving') => void): CleanupFn => {
  const ctx = new Context();

  void space
    .waitUntilReady()
    .then(() => {
      if (ctx.disposed) {
        return;
      }

      let hasUnsavedChanges = false;
      let lastFlushPromise: Promise<void> | undefined;
      space.db.saveStateChanged.on(ctx, ({ unsavedDocuments }) => {
        hasUnsavedChanges = unsavedDocuments.length > 0;
      });
      space.db.saveStateChanged.debounce(500).on(ctx, () => {
        if (hasUnsavedChanges) {
          lastFlushPromise = undefined;
          cb('saving');
        } else {
          const flushPromise = space.db.flush();
          lastFlushPromise = flushPromise;
          void flushPromise.then(
            () => {
              if (lastFlushPromise === flushPromise) {
                cb('saved');
              }
            },
            (error: unknown) => {
              // The failed write is logged where it failed; here it only means the space is not saved.
              log.verbose('space flush failed', { error });
              if (lastFlushPromise === flushPromise) {
                cb('saving');
              }
            },
          );
        }
      });
    })
    .catch((err) => log.catch(err));

  return () => {
    void ctx.dispose();
  };
};
