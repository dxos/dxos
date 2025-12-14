//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { Blueprint, Template } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { trim } from '@dxos/util';

import { MarkdownFunction } from '../functions';

const functions: FunctionDefinition[] = [MarkdownFunction.create, MarkdownFunction.open, MarkdownFunction.update];

export const MARKDOWN_BLUEPRINT_KEY = 'dxos.org/blueprint/markdown';

export const MarkdownBlueprint = Blueprint.make({
  key: MARKDOWN_BLUEPRINT_KEY,
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

export default () => [
  contributes(Capabilities.Functions, functions),
  contributes(Capabilities.BlueprintDefinition, MarkdownBlueprint),
];
