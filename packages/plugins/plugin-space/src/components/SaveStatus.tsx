//
// Copyright 2024 DXOS.org
//

import { ArrowsClockwise, CheckCircle } from '@phosphor-icons/react';
import React, { useEffect } from 'react';

import { StatusBar } from '@dxos/plugin-status-bar';
import { useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import type { UnsubscribeCallback } from '@dxos/async';
import type { Client } from '@dxos/client';
import { type Space, type SpaceId } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { useClient } from '@dxos/react-client';
import { SPACE_PLUGIN } from '../meta';

export const SaveStatus = () => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const client = useClient();
  const [state, setState] = React.useState<'saved' | 'saving'>('saved');

  useEffect(() => {
    return createClientSaveTracker(client, (state) => {
      setState(state);
    });
  }, []);

  return (
    <StatusBar.Item title={state === 'saving' ? t('saving label') : t('saved label')}>
      {state === 'saving' ? <ArrowsClockwise className={getSize(3)} /> : <CheckCircle className={getSize(3)} />}
    </StatusBar.Item>
  );
};

const createClientSaveTracker = (client: Client, cb: (state: 'saved' | 'saving') => void) => {
  const unsubscribeCallbacks: Record<SpaceId, UnsubscribeCallback> = {};
  const state: Record<SpaceId, 'saved' | 'saving'> = {};

  function install(spaces: Space[]) {
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
  }
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

  space.waitUntilReady().then(() => {
    if (ctx.disposed) {
      return;
    }

    let hasUnsavedChanges = false,
      lastFlushPromise: Promise<void> | undefined;
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
        flushPromise.then(() => {
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
