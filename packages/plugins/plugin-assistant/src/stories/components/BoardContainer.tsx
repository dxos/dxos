//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Filter } from '@dxos/echo';
import { Board, BoardContainer as NativeBoardContainer } from '@dxos/plugin-board';
import { useQuery } from '@dxos/react-client/echo';

import { type ComponentProps } from './types';

export const BoardContainer = ({ space }: ComponentProps) => {
  const [board] = useQuery(space, Filter.type(Board.Board));
  if (!board) {
    return null;
  }

  return <NativeBoardContainer board={board} />;
};
