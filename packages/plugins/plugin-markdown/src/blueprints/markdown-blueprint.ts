//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { MarkdownFunctions } from './functions';

const BLUEPRINT_KEY = 'dxos.org/blueprint/markdown';

const functions = Object.values(MarkdownFunctions);

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Markdown',
    tools: Blueprint.toolDefinitions({ functions }),
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
  functions,
  make,
};

export default blueprint;
