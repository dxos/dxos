//
// Copyright 2024 DXOS.org
//

import React, { type ComponentProps } from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Chess } from './Chess';

const ChessContainer = ({ game, role }: Pick<ComponentProps<typeof Chess>, 'game'> & { role?: string }) => {
  const space = getSpace(game);
  if (!space) {
    return null;
  }

  return (
    <StackItem.Content toolbar={false}>
      <Chess game={game} space={space} playerSelector={role === 'article'} />
    </StackItem.Content>
  );
};

export default ChessContainer;
