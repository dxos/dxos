//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { Capabilities, contributes } from '@dxos/app-framework';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { move, play } from '../functions';

const functions = [move, play];

export default () => {
  return [
    contributes(
      Capabilities.BlueprintDefinition,
      Blueprint.make({
        key: 'dxos.org/blueprint/chess',
        name: 'Chess',
        instructions: Template.make({
          source: trim`
            You are an expert chess player.
            To analyze a game you can access the "pgn" property by loading the context object that represents the current game.
            You could suggest a good next move or offer to play a move.
            Don't actually make a move unless you are asked to.
          `,
        }),
        tools: functions.map((tool) => ToolId.make(tool.name)),
      }),
    ),
    contributes(Capabilities.Functions, functions),
  ];
};
