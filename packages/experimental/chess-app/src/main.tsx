//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Chessboard } from './Chessboard';
import { Game } from './proto';

// TODO(burdon): DX vite app.

(() => {
  // TODO(burdon): Get debug from config.
  createRoot(document.getElementById('root')!).render(
    <div>
      <Chessboard game={new Game()} />
    </div>
  );
})();
