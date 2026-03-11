//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { TicTacToeFunctions } from './functions';

const BLUEPRINT_KEY = 'dxos.org/blueprint/tictactoe';

const functions = Object.values(TicTacToeFunctions);

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Tic-Tac-Toe',
    tools: Blueprint.toolDefinitions({ functions }),
    instructions: Template.make({
      source: trim`
        You are an expert Tic-Tac-Toe player using optimal minimax strategy.
        You can view the current board by loading the context object's 'moves' array and deriving state.
        Suggest the optimal next move when asked.
        Do not place a mark unless explicitly asked to do so.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  functions,
  make,
};

export default blueprint;
