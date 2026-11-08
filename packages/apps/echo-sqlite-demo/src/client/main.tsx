//
// Copyright 2026 DXOS.org
//

import './style.css';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';
import { openDatabase } from './database.ts';

const root = createRoot(document.getElementById('root')!);

// Opening reads only the persisted type rows, so it costs the same at any space size.
openDatabase().then(
  ({ db, checkpoint, release }) => root.render(<App db={db} checkpoint={checkpoint} release={release} />),
  (error) => {
    console.error(error);
    root.render(
      <main>
        <h1>Could not open the database</h1>
        <p>
          This demo needs OPFS in a dedicated worker. It works in Chrome, Edge and Safari 17+; a private window may
          block origin storage.
        </p>
        <pre>{String(error)}</pre>
      </main>,
    );
  },
);
