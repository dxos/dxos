//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { Create, Move, Play, Print } from '#operations';

const BLUEPRINT_KEY = 'org.dxos.blueprint.chess';

const operations = [Create, Move, Play, Print];

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
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
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
