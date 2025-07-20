//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Board as BoardComponent } from '@dxos/react-ui-board';
import { StackItem } from '@dxos/react-ui-stack';

import { type Board } from '../types';

// TODO(burdon): Factor out.
type BoardContainerProps = { role: string; board: Board.Board };

export const BoardContainer = ({ board }: BoardContainerProps) => {
  return (
    <StackItem.Content>
      <BoardComponent.Root />
    </StackItem.Content>
  );
};
