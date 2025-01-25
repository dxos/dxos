//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { Chess } from 'chess.js';
import React, { useState } from 'react';

import { mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { Chessboard, type ChessModel, type ChessMove, ChessPanel } from './Chessboard';

const Story = ({ size, panel = false }: { size?: 'large' | 'small'; panel: boolean }) => {
  const [model, setModel] = useState<ChessModel>({ chess: new Chess() });
  const handleUpdate = (move: ChessMove) => {
    if (model.chess.move(move)) {
      setModel({ ...model });
    }
  };

  return (
    <div className='flex flex-row'>
      <div className={mx(size === 'small' ? 'w-[320px]' : 'w-[640px]')}>
        <Chessboard model={model} onUpdate={handleUpdate} />
      </div>
      {panel && (
        <div className='w-[160px] ml-8'>
          <ChessPanel model={model} />
        </div>
      )}
    </div>
  );
};

export default {
  title: 'plugins/plugin-chess/Chessboard',
  component: Chessboard,
  render: Story,
  decorators: [withTheme],
};

export const Default = {};

export const Panel = {
  args: {
    panel: true,
  },
};

export const Micro = {
  args: {
    size: 'small',
  },
};
