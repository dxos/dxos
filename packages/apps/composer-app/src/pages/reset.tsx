//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { IdbLogStore } from '@dxos/log-store-idb';
import { ThemeProvider, Tooltip, defaultTx } from '@dxos/react-ui';

import { ResetDialog } from '../components/index.ts';
import { resetComposerStorage } from '../recovery/index.ts';
import { LOG_STORE_DB_NAME, translations } from '../util/index.ts';

const logStore = new IdbLogStore({ dbName: LOG_STORE_DB_NAME });

// Minimal bootstrap — theme, translations, and the dialog only; no client services or plugins, so
// the page renders even when the app itself cannot boot.
const handleReset = async () => {
  try {
    // The wipe deletes every IndexedDB database for the origin; the log store's open connection
    // would block that deletion.
    await logStore.close();
    const { ok } = await resetComposerStorage((message) => log.info(message));
    if (!ok) {
      log.error('reset completed with errors — staying on the reset page');
      return;
    }
  } catch (error) {
    log.catch(error);
    return;
  }

  window.location.href = '/';
};

const root = document.getElementById('root');
invariant(root);
createRoot(root).render(
  <StrictMode>
    <ThemeProvider tx={defaultTx} resourceExtensions={translations}>
      <Tooltip.Provider>
        <ResetDialog logStore={logStore} onReset={handleReset} onRefresh={() => (window.location.href = '/')} />
      </Tooltip.Provider>
    </ThemeProvider>
  </StrictMode>,
);
