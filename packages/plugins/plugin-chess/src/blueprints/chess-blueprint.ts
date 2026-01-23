//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { trim } from '@dxos/util';

import { create, move, play, print } from './functions';

export const Key = 'dxos.org/blueprint/chess';

export const functions: FunctionDefinition[] = [create, move, play, print];

export const make = () =>
  Blueprint.make({
    key: Key,
    name: 'Chess',
    tools: Blueprint.toolDefinitions({ functions }),
    instructions: Template.make({
      source: trim`
        You are an expert chess player.
        To analyze a game you can access the "pgn" property by loading the context object that represents the current game.
        You could suggest a good next move or offer to play a move.
        Don't actually make a move unless you are asked to.
      `,
    }),
  });
