//
// Copyright 2025 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { Chess, ChessOperation } from '#types';

const operations = [ChessOperation.Move, ChessOperation.Play, ChessOperation.Print];

const make = () =>
  Skill.make({
    key: Chess.SKILL_KEY,
    name: 'Chess',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You are an expert chess player.
        To analyze a game you can access the "pgn" property by loading the context object that represents the current game.
        You could suggest a good next move or offer to play a move.
        Don't actually make a move unless you are asked to.

        When setting a chess position, always set the "pgn" field (move list in standard PGN notation) on the org.dxos.type.chess.state object.
        The "fen" field is not used by the UI for display — the board is driven exclusively from "pgn".
        Setting "fen" alone or leaving "pgn" empty will result in the initial position being shown.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: Chess.SKILL_KEY,
  make,
};

export default skill;
