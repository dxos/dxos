//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Game } from './Game';

// TODO(burdon): DX app and components.

(() => {
  // TODO(burdon): Get debug from config.
  createRoot(document.getElementById('root')!).render(
    <div>
      <Game />
    </div>
  );
})();
