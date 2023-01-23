import { useIdentity, useQuery, withReactor } from "@dxos/react-client";
import { useSpace } from "../hooks";
import { Game, State, PolicyCard, Policy, Player, Character, Party } from "../proto";
import React from 'react'
import { humanize, range } from "@dxos/util";
import { Button } from "@dxos/react-components";
import { Card, Input } from "../components";
import { id } from "@dxos/echo-schema";

export const HitlerFrame = withReactor(() => {
  const { identityKey } = useIdentity()!;
  const space = useSpace()
  const [game] = useQuery(space, Game.filter());

  const createGame = () => {
    space.experimental.db.save(new Game({
      hostMemberKey: identityKey.toHex(),
      players: [],
      state: State.LOBBY,
      deck: [
        ...range(11).map(() => new PolicyCard({
          policy: Policy.FASCIST_POLICY
        })),
        ...range(6).map(() => new PolicyCard({
          policy: Policy.LIBERAL_POLICY
        })),
      ],
      discard: [],
      rounds: [],
      policies: []
    }))
  }


  if (!game) {
    return (
      <Button onClick={createGame}>Create Game</Button>
    )
  }

  return <LiveGame game={game} />;
})

export const LiveGame = withReactor(({ game }: { game: Game }) => {

  if (game.state === State.LOBBY) {
    return <GameInLobby game={game} />
  } else if (game.state === State.GAME) {
    return <GameInProgress game={game} />
  }

  return null
})

export const GameInLobby = withReactor(({ game }: { game: Game }) => {
  const { identityKey } = useIdentity()!;

  const us = game.players.find(player => player.memberKey === identityKey.toHex())

  const handleStartGame = () => {
    game.state = State.GAME

    let numFascist = 0
    switch (game.players.length) {
      case 5:
      case 6:
        numFascist = 2
        break
      case 7:
      case 8:
        numFascist = 3
        break
      case 9:
      case 10:
        numFascist = 4
        break
    }

    const order = shuffle(game.players)
    order[0].party = Party.FASCIST_PARTY
    order[0].character = Character.HITLER

    for(const player of order.slice(1)) {
      if(--numFascist > 0) {
        player.party = Party.FASCIST_PARTY
        player.character = Character.FASHIST
      } else {
        player.party = Party.LIBERAL_PARTY
        player.character = Character.LIBERAL
      }
    }
  }

  return (
    <div>
      {game.players.map(player => (
        <div key={player[id]}>
          {player.name}
        </div>
      )
      )}
      {!us && <Button onClick={() => {
        game.players.push(new Player({
          memberKey: identityKey.toHex(),
          name: humanize(identityKey),
        }))
      }}>Join Game</Button>}
      {us && <PlayerCard player={us} />}
      {us?.memberKey === game.hostMemberKey && game.players.length !== 0 &&
        <Button onClick={handleStartGame} >
          Start Game
        </Button>}
    </div >
  )
})

export const PlayerCard = withReactor(({ player }: { player: Player }) => {
  return (
    <Card>
      <div className="h-[300px] w-[500px]">
        <input
          value={player.name}
          onChange={e => { player.name = e.currentTarget.value }}
        />
        {player.party && <div>{player.party}</div>}
        {player.character && <div>{player.character}</div>}
      </div>
    </Card>
  )
})

export const GameInProgress = withReactor(({ game }: { game: Game }) => {
  const { identityKey } = useIdentity()!;

  const us = game.players.find(player => player.memberKey === identityKey.toHex())!
  return <PlayerCard player={us} />
})

function shuffle<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}
