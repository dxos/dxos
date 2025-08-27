//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes } from '@dxos/app-framework';
import { Blueprint, Template } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { trim } from '@dxos/util';

import { create, diff, open } from '../functions';

const functions: FunctionDefinition[] = [create, diff, open];

export const BLUEPRINT_KEY = 'dxos.org/blueprint/markdown';

export default (): Capability<any>[] => [
  contributes(Capabilities.Functions, functions),
  contributes(
    Capabilities.BlueprintDefinition,
    Blueprint.make({
      key: BLUEPRINT_KEY,
      name: 'Markdown',
      tools: Blueprint.toolDefinitions({ functions }),
      instructions: Template.make({
        source: trim`
            You can create and update markdown documents.
            When asked to edit or update documents return updates as a set of compact diff string pairs.
            For each diff, respond with the smallest possible matching span.
            For example:
            - "There is a tyop in this sentence."
            + "There is a typo in this sentence."
            - "This id goof."
            + "This is good."
          `,
      }),
    }),
  ),
];
