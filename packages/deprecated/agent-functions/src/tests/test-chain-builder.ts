//
// Copyright 2024 DXOS.org
//

import { create, type Space } from '@dxos/client/echo';
import { type TemplateInput, TemplateInputType, TemplateType } from '@dxos/plugin-automation/types';

import { str } from '../util';

export type CreateTestTemplateInput = {
  command?: string;
  template?: string;
  inputs?: TemplateInput[];
};

export const createTestChain = (space: Space, args?: CreateTestTemplateInput) => {
  return space.db.add(
    create(TemplateType, {
      command: args?.command ?? 'translate',
      template: args?.template ?? str('Translate the following into {language}:', '---', '{input}'),
      inputs: args?.inputs ?? [
        {
          type: TemplateInputType.VALUE,
          name: 'language',
          value: 'japanese',
        },
        {
          type: TemplateInputType.PASS_THROUGH,
          name: 'input',
        },
      ],
    }),
  );
};
