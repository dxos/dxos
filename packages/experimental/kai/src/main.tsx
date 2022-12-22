//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

// TODO(burdon): Config.
// https://github.com/dxos/dxos/tree/main/packages/common/react-ui#2-reference-the-basic-stylesheet

// import '@dxosTheme';
import './style.css';

import { App } from './containers';

(() => {
  createRoot(document.getElementById('root')!).render(<App />);
})();
