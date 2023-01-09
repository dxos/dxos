//
// Copyright 2023 DXOS.org
//

import { Chessboard } from 'packages/experimental/chess-app/src/Chessboard';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { Game } from './proto';

// TODO(burdon): DX app and components.

(() => {
  // TODO(burdon): Get debug from config.
  createRoot(document.getElementById('root')!).render(
    <div>
      <Chessboard game={new Game()} />
    </div>
  );
})();
