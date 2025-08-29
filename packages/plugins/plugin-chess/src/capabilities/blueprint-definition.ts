//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { Blueprint, Template } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { trim } from '@dxos/util';

import { create, move, play } from '../functions';

export const BLUEPRINT_KEY = 'dxos.org/blueprint/chess';

const functions: FunctionDefinition[] = [create, move, play];

export default () => {
  return [
    contributes(Capabilities.Functions, functions),
    contributes(Capabilities.BlueprintDefinition, () =>
      Blueprint.make({
        key: BLUEPRINT_KEY,
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
      }),
    ),
  ];
};
