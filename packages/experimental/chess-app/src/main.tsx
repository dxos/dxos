//
// Copyright 2023 DXOS.org
//

import { Chess } from 'chess.js';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { Chessboard } from './Chessboard';

(() => {
  // TODO(burdon): DX vite app.
  createRoot(document.getElementById('root')!).render(
    <div>
      <Chessboard model={{ chess: new Chess() }} />
    </div>
  );
})();
