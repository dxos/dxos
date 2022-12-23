//
// Copyright 2020 DXOS.org
//

// TODO(burdon): Routes.
// TODO(burdon): Invitations (auto and user-initiated).
// TODO(burdon): Useful task list.
// TODO(burdon): Cards (see kitchen sink).
// TODO(burdon): Masonry (web/desktop/mobile).
// TODO(burdon): Electron app.
// TODO(burdon): Virtual table.

import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './containers';

// TODO(burdon): Config.
// https://github.com/dxos/dxos/tree/main/packages/common/react-ui#2-reference-the-basic-stylesheet
// import '@dxosTheme';
import './style.css';

(() => {
  createRoot(document.getElementById('root')!).render(<App />);
})();
