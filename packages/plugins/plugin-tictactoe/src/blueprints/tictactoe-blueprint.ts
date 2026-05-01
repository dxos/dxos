//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { Create, MakeMove, AiMove, Print } from '#operations';

const BLUEPRINT_KEY = 'org.dxos.blueprint.tictactoe';

const operations = [Create, MakeMove, AiMove, Print];

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Tic-Tac-Toe',
    tools: Blueprint.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You are a Tic-Tac-Toe game assistant.
        You can create games, make moves, and analyze board state.
        Use the print operation to display the current board in ASCII.
        You can play as an opponent using the AI move operation.
        Don't make a move unless asked to.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
