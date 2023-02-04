//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useIdentity, withReactor } from '@dxos/react-client';
import { Button } from '@dxos/react-components';
import { range } from '@dxos/util';

import { useSpace } from '../hooks';
import { Game, State, PolicyCard, Policy } from '../proto';
import { GameInLobby } from './GameInLobby';
import { GameInProgress } from './GameInProgress';
import { useGame } from './hooks';

export const HitlerFrame = withReactor(() => {
  const space = useSpace();
  const game = useGame();
  const { identityKey } = useIdentity()!;

  const createGame = () => {
    space.experimental.db
      .save(
        new Game({
          hostMemberKey: identityKey.toHex(),
          players: [],
          state: State.LOBBY,
          deck: [
            ...range(11).map(
              () =>
                new PolicyCard({
                  policy: Policy.FASCIST_POLICY
                })
            ),
            ...range(6).map(
              () =>
                new PolicyCard({
                  policy: Policy.LIBERAL_POLICY
                })
            )
          ],
          discard: [],
          rounds: [],
          policies: [],
          anarchyCounter: 0
        })
      )
      .catch((err) => {
        throw new Error(err);
      });
  };

  return (
    <div>
      {game && (
        <Button className='bg-red-500 w-full' onClick={() => space.experimental.db.delete(game)}>
          Clear
        </Button>
      )}
      {!game && <Button onClick={createGame}>Create Game</Button>}
      {game?.state === State.LOBBY && <GameInLobby />}
      {game?.state === State.GAME && <GameInProgress />}
      {game?.state === State.FASCISTS_WON && 'FASCISTS WON!!!'}
      {game?.state === State.LIBERALS_WON && 'LIBERALS WON!!!'}
    </div>
  );
});
