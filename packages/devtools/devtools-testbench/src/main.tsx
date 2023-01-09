//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { AppView } from '@dxos/kai';

import { App } from './app';

import '@dxos/kai/src/style.css';
import './style.css';

(() => {
  // TODO(burdon): Get debug from config.
  createRoot(document.getElementById('root')!).render(
    <App
      views={[
        AppView.DASHBOARD,
        AppView.ORGS,
        AppView.PROJECTS,
        AppView.CONTACTS,
        AppView.KANBAN,
        AppView.TASKS,
        AppView.GRAPH,
        AppView.EDITOR,
        AppView.GAME
      ]}
      debug={false}
    />
  );
})();
