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
    return <Chessboard game={new Game()} />;
  }
};
