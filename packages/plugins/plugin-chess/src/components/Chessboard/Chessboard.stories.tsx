//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { Chess } from 'chess.js';
import React, { useState } from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Chessboard, type ChessModel, type ChessMove, ChessPanel } from './Chessboard';

const Story = () => {
  const [model, setModel] = useState<ChessModel>({ chess: new Chess() });
  const handleUpdate = (move: ChessMove) => {
    if (model.chess.move(move)) {
      setModel({ ...model });
    }
  };

  return (
    <div className='flex flex-row'>
      <div className='w-[600px]'>
        <Chessboard model={model} boardStyle='default' onUpdate={handleUpdate} />
      </div>
      <div className='w-[160px] ml-8'>
        <ChessPanel model={model} />
      </div>
    </div>
  );
};

export default {
  title: 'plugins/plugin-chess/Chessboard',
  component: Chessboard,
  render: Story,
  decorators: [withTheme],
};

export const Default = {
  component: Chessboard,
};
