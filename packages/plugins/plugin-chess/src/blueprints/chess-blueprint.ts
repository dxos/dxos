//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { Chess, ChessOperation } from '#types';

const operations = [ChessOperation.Move, ChessOperation.Play, ChessOperation.Print];

const make = () =>
  Blueprint.make({
    key: Chess.BLUEPRINT_KEY,
    name: 'Chess',
    tools: Blueprint.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You are an expert chess player.
        To analyze a game you can access the "pgn" property by loading the context object that represents the current game.
        You could suggest a good next move or offer to play a move.
        Don't actually make a move unless you are asked to.
      `,
    }),
  });

const blueprint: Blueprint.Definition = {
  key: Chess.BLUEPRINT_KEY,
  make,
};

export default blueprint;
