//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { Chess } from 'chess.js';
import React, { useState } from 'react';
import { withClientProvider } from '@dxos/react-client/testing';
 
import { withTheme } from '@dxos/storybook-utils';

import { Chessboard, type ChessModel, type ChessMove, ChessPanel } from './Chessboard';
import CallsContainer  from './CallsContainer';
import { Calls } from './Calls';

const Story = () => {
  return (
    <Calls roomName={'test-room'} />  
  );
};


export default {
  title: 'plugins/plugin-calls/CallsContainer',
  component: CallsContainer,
  render: Story,
  decorators: [
    withTheme,
  ]
};

export const Default = {
  component: Chessboard,
};

