//
// Copyright 2024 DXOS.org
//

import { type UnsubscribeCallback } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Space, type SpaceId } from '@dxos/client/echo';
import { Context } from '@dxos/context';

export const createClientSaveTracker = (client: Client, cb: (state: 'saved' | 'saving') => void) => {
  const unsubscribeCallbacks: Record<SpaceId, UnsubscribeCallback> = {};
  const state: Record<SpaceId, 'saved' | 'saving'> = {};

  const install = (spaces: Space[]) => {
    for (const space of spaces) {
      if (state[space.id]) {
        continue;
      }

      state[space.id] = 'saved';
      unsubscribeCallbacks[space.id] = createSpaceSaveTracker(space, (s) => {
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
    for (const unsubscribe of Object.values(unsubscribeCallbacks)) {
      unsubscribe();
    }
  };
};

const createSpaceSaveTracker = (space: Space, cb: (state: 'saved' | 'saving') => void): UnsubscribeCallback => {
  const ctx = new Context();

  void space.waitUntilReady().then(() => {
    if (ctx.disposed) {
      return;
    }

    let hasUnsavedChanges = false;
    let lastFlushPromise: Promise<void> | undefined;
    space.crud.saveStateChanged.on(ctx, ({ unsavedDocuments }) => {
      hasUnsavedChanges = unsavedDocuments.length > 0;
    });
    space.crud.saveStateChanged.debounce(500).on(ctx, () => {
      if (hasUnsavedChanges) {
        lastFlushPromise = undefined;
        cb('saving');
      } else {
        const flushPromise = space.crud.flush();
        lastFlushPromise = flushPromise;
        void flushPromise.then(() => {
          if (lastFlushPromise === flushPromise) {
            cb('saved');
          }
        });
      }
    });
  });

  return () => {
    void ctx.dispose();
  };
};
