//
// Copyright 2023 DXOS.org
//

import { useIdentity, useQuery } from '@dxos/react-client';

import { useSpace } from '../hooks';
import { Game } from '../proto';

export const useGame = (): Game | undefined => {
  const space = useSpace();
  const [game] = useQuery(space, Game.filter());
  return game;
};

export const useUs = () => {
  const game = useGame();
  const { identityKey } = useIdentity()!;
  const us = game?.players.find((player) => player.memberKey === identityKey.toHex());
  return us;
};
