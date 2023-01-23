//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { id } from '@dxos/echo-schema';
import { useIdentity, withReactor } from '@dxos/react-client';
import { Button } from '@dxos/react-components';
import { humanize, range } from '@dxos/util';

import { Card } from '../components';
import { useSpace } from '../hooks';
import { Game, State, PolicyCard, Policy, Player, Character, Party } from '../proto';
import { useGame, useUs } from './useGame';

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
          policies: []
        })
      )
      .catch((err) => {
        throw new Error(err);
      });
  };

  return (
    <>
      {!game && <Button onClick={createGame}>Create Game</Button>}
      {game?.state === State.LOBBY && <GameInLobby />}
      {game?.state === State.GAME && <GameInProgress />}
    </>
  );
});

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

export const PlayersList = withReactor(() => {
  const game = useGame();
  return (
    <div>
      {game?.players.map((player) => (
        <div key={player[id]}>{player.name}</div>
      ))}
    </div>
  );
});

export const PlayerCard = withReactor(({ player }: { player: Player }) => {
  const game = useGame();
  return (
    <Card>
      <div className='h-[300px] w-[500px]'>
        {game?.state === State.LOBBY && (
          <input
            value={player.name}
            onChange={(e) => {
              player.name = e.currentTarget.value;
            }}
          />
        )}
        {player.party && <div>{player.party}</div>}
        {player.character && <div>{player.character}</div>}
      </div>
    </Card>
  );
});

export const GameInProgress = withReactor(() => {
  const game = useGame()!;
  const { identityKey } = useIdentity()!;

  const us = game.players.find((player) => player.memberKey === identityKey.toHex())!;
  return (
    <div>
      <div>
        <PlayerCard player={us} />
        <PlayersList />
      </div>

      <Policies />
    </div>
  );
});

export const Policies = withReactor(() => {
  const game = useGame();
  const numFascist = game?.policies.filter((policy) => policy.policy === Policy.FASCIST_POLICY).length ?? 0;
  const numLiberal = game?.policies.filter((policy) => policy.policy === Policy.LIBERAL_POLICY).length ?? 0;

  return (
    <div className='flex flex-col'>
      <div className='flex flex-row'>
        {range(numFascist).map((i) => (
          <div key={i}>F</div>
        ))}
      </div>
      <div className='flex flex-row'>
        {range(numLiberal).map((i) => (
          <div key={i}>L</div>
        ))}
      </div>
    </div>
  );
});

const shuffle = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};
