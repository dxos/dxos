//
// Copyright 2023 DXOS.org
//

import { Chess } from 'chess.js';
import React from 'react';

import { Chessboard } from './Chessboard';

export default {
  component: Chessboard,
  argTypes: {}
};

export const Default = {
  render: () => {
    // TODO(burdon): Make responsive.
    return (
      <div style={{ width: 600 }}>
        <Chessboard model={{ chess: new Chess() }} />
      </div>
    );
  }
};
