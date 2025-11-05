//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes } from '@dxos/app-framework';
import { Blueprint, Template } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { trim } from '@dxos/util';

import { createProposals } from '../functions';

const functions: FunctionDefinition[] = [createProposals];

export const ASSISTANT_BLUEPRINT_KEY = 'dxos.org/blueprint/thread';

export default (): Capability<any>[] => [
  contributes(Capabilities.Functions, functions),
  contributes(
    Capabilities.BlueprintDefinition,
    Blueprint.make({
      key: ASSISTANT_BLUEPRINT_KEY,
      name: 'Thread',
      tools: Blueprint.toolDefinitions({ functions }),
      instructions: Template.make({
        // TODO(wittjosiah): Move example to function input schema annotation.
        source: trim`
            You can update markdown documents via proposals.
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
