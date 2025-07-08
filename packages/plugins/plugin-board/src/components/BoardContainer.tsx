//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Board } from '@dxos/react-ui-board';
import { StackItem } from '@dxos/react-ui-stack';

import { type BoardType } from '../types';

// TODO(burdon): Factor out.
type BoardContainerProps = { role: string; board: BoardType };

export const BoardContainer = ({ board }: BoardContainerProps) => {
  return (
    <StackItem.Content>
      <Board.Root />
    </StackItem.Content>
  );
};
