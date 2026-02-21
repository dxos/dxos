//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { ThreadFunctions } from '../functions';

const BLUEPRINT_KEY = 'dxos.org/blueprint/thread';

const functions = Object.values(ThreadFunctions);

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
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

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  functions,
  make,
};

export default blueprint;
