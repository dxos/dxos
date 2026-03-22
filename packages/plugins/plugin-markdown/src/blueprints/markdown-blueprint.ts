//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { Create, Open, Update } from '../operations/definitions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.markdown';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Markdown',
    description: 'Work with markdown documents. Preferred over raw database operations.',
    tools: Blueprint.toolDefinitions({ operations: [Create, Open, Update] }),
    instructions: Template.make({
      // TODO(wittjosiah): Move example to function input schema annotation.
      source: trim`
        {{! Markdown }}

        You can create, read and update markdown documents.
        When asked to edit or update documents return updates as a set of compact diff string pairs.
        For each diff, respond with the smallest possible matching span.

        Example:
        ${'```'}diff
        - "There is a tyop in this sentence."
        + "There is a typo in this sentence."
        - "This id good."
        + "This sentence is really good."
        ${'```'}
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
