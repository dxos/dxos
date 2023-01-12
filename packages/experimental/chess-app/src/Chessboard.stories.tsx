//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Chessboard } from './Chessboard';
import { Game } from './proto';

export default {
  component: Chessboard,
  argTypes: {}
};

export const Default = {
  render: () => {
    // TODO(burdon): Make responsive.
    return (
      <div style={{ width: 600 }}>
        <Chessboard game={new Game()} />
      </div>
    );
  }
};
