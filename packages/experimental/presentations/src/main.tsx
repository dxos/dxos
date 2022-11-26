//
// Copyright 2022 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom/client';

import Index from './slides/index.mdx';

// TODO(burdon): Tailwind.
// TODO(burdon): Router (change URL).

import './style.css';

const start = async () => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Index />
    </React.StrictMode>
  );
};

void start();
