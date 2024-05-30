//
// Copyright 2024 DXOS.org
//

import { type ChainInput, ChainInputType, ChainPromptType } from '@braneframe/types';
import { create, type Space } from '@dxos/client/echo';

import { str } from '../util';

export type CreateTestChainInput = {
  command?: string;
  template?: string;
  inputs?: ChainInput[];
};

export const createTestChain = (space: Space, args?: CreateTestChainInput) => {
  return space.db.add(
    create(ChainPromptType, {
      command: args?.command ?? 'translate',
      template: args?.template ?? str('Translate the following into {language}:', '---', '{input}'),
      inputs: args?.inputs ?? [
        {
          type: ChainInputType.VALUE,
          name: 'language',
          value: 'japanese',
        },
        {
          type: ChainInputType.PASS_THROUGH,
          name: 'input',
        },
      ],
    }),
  );
};
