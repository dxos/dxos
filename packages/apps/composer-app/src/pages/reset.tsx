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

import { ResetDialog } from '../components';
import { resetComposerStorage } from '../recovery';
import { LOG_STORE_DB_NAME, translations } from '../util';

// Minimal bootstrap — theme, translations, and the dialog only; no client services or plugins.
// The wipe runs only after the dialog's explicit confirm (previously a bare `confirm()` alert
// wiped storage immediately on load).
const handleReset = async () => {
  await resetComposerStorage((message) => log.info(message));
  window.location.href = '/';
};

const logStore = new IdbLogStore({ dbName: LOG_STORE_DB_NAME });

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
