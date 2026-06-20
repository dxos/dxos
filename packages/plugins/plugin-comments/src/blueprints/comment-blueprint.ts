//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { CommentOperation } from '#types';

const BLUEPRINT_KEY = 'org.dxos.blueprint.comments';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Comments',
    tools: Blueprint.toolDefinitions({ operations: [CommentOperation.CreateProposals] }),
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
