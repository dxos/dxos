//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useIdentity, withReactor } from '@dxos/react-client';
import { Button } from '@dxos/react-components';
import { humanize } from '@dxos/util';

import { State, Player, Character, Party } from '../proto';
import { PlayerCard } from './PlayerCard';
import { PlayersList } from './PlayersList';
import { useGame, useUs } from './useGame';

export const GameInLobby = withReactor(() => {
  const game = useGame()!;
  const { identityKey } = useIdentity()!;
  const us = useUs();

  const handleJoinGame = () => {
    game.players.push(
      new Player({
        memberKey: identityKey.toHex(),
        name: humanize(identityKey)
      })
    );
  };

  const handleStartGame = () => {
    game.state = State.GAME;

    let numFascist = 0;
    switch (game.players.length) {
      case 5:
      case 6:
        numFascist = 2;
        break;
      case 7:
      case 8:
        numFascist = 3;
        break;
      case 9:
      case 10:
        numFascist = 4;
        break;
    }

    const order = shuffle(game.players);
    order[0].party = Party.FASCIST_PARTY;
    order[0].character = Character.HITLER;

    for (const player of order.slice(1)) {
      if (--numFascist > 0) {
        player.party = Party.FASCIST_PARTY;
        player.character = Character.FASHIST;
      } else {
        player.party = Party.LIBERAL_PARTY;
        player.character = Character.LIBERAL;
      }
    }

    game.state = State.GAME;
  };

  return (
    <div>
      <PlayersList />
      {us && <PlayerCard player={us} />}
      {!us && <Button onClick={handleJoinGame}>Join Game</Button>}
      {us?.memberKey === game.hostMemberKey && game.players.length !== 0 && (
        <Button onClick={handleStartGame}>Start Game</Button>
      )}
    </div>
  );
});

const shuffle = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};
