//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { trim } from '@dxos/util';

import { createProposals } from '../functions';

export const functions: FunctionDefinition[] = [createProposals];

export const Key = 'dxos.org/blueprint/thread';

export const make = () =>
  Blueprint.make({
    key: Key,
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
  });
