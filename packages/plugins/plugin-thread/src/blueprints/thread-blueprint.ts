//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { ThreadOperation } from '#operations';

const BLUEPRINT_KEY = 'org.dxos.blueprint.thread';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Thread',
    tools: Blueprint.toolDefinitions({ operations: [ThreadOperation.CreateProposals] }),
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

const blueprint: Blueprint.Definition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
