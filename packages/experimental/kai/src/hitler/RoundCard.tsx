//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { withReactor } from '@dxos/react-client';
import { Button } from '@dxos/react-components';

import { Player, RoundState, Vote, VoteByPlayer } from '../proto';
import { PlayersList } from './PlayersList';
import { useGame, useUs } from './hooks';

export const RoundCard = withReactor(() => {
  const game = useGame()!;
  const round = game.rounds.at(-1)!;

  if (!round) {
    return null;
  }

  return (
    <>
      {round.state === RoundState.NOMINATE_CHANCELLOR && <NominateChancellor />}
      {round.state === RoundState.ELECTION && <Election />}
      {/* {round.state === RoundState.POLICY_PEEK && <PolicyPeek />}
      {round.state === RoundState.INVESTIGATE_LOYALTY && <INVESTIGATE_LOYALTY />}
      {round.state === RoundState.SPECIAL_ELECTION && <SPECIAL_ELECTION />}
      {round.state === RoundState.POLICY_PEAK && <POLICY_PEAK />}
      {round.state === RoundState.EXECUTION && <EXECUTION />} */}
    </>
  );
});

const NominateChancellor = withReactor(() => {
  const game = useGame()!;
  const round = game.rounds.at(-1)!;
  const us = useUs()!;

  const [candidate, setCandidate] = useState<Player>();

  const handleCandidateSelect = (player: Player) => {
    if (player.memberKey === round.president.memberKey) {
      return;
    }
    setCandidate(player);
  };

  return (
    <div className='flex flex-col'>
      <div className='text-2xl'>Nominate Chancellor</div>
      {us.memberKey === round.president.memberKey && (
        <div>
          <div className='text-xl'>Select a player to nominate as chancellor</div>
          <div className='flex flex-row'>
            <PlayersList selected={candidate?.memberKey} onSelect={handleCandidateSelect} />
            <Button
              className='bg-green-700 hover:bg-green-900 text-white'
              disabled={!candidate}
              onClick={() => {
                round.chancellor = candidate!;
                round.state = RoundState.ELECTION;
              }}
            >
              Nominate
            </Button>
            <Button
              className='bg-red-700 hover:bg-red-9  00 text-white'
              onClick={() => {
                setCandidate(undefined);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

const Election = withReactor(() => {
  // TODO(mykola): Implement term-limitation for last president and last chancellor.
  const game = useGame()!;
  const round = game.rounds.at(-1)!;
  const us = useUs()!;

  round.election.votes = [];

  const handleVote = (vote: Vote) => {
    round.election.votes.push(new VoteByPlayer({ player: us, vote }));
    if (round.election.votes.length === game.players.length) {
      const yesVotes = round.election.votes.filter((vote) => vote.vote === Vote.JA).length;
      if (yesVotes > game.players.length / 2) {
        round.state = RoundState.POLICY_PEEK;
      } else {
        round.state = RoundState.END_ROUND;
        game.anarchyCounter++;
      }
    }
  };

  return (
    <div className='flex flex-col'>
      <div className='text-2xl'>Election</div>
      <div className='text-xl'>Vote for {round.chancellor?.name}?</div>
      <div className='flex flex-row'>
        <button
          className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
          onClick={() => handleVote(Vote.JA)}
        >
          Ja
        </button>
        <button
          className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
          onClick={() => handleVote(Vote.NEIN)}
        >
          Nein
        </button>
      </div>
    </div>
  );
});
