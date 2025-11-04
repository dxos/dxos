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

export const MarkdownBlueprint: Blueprint.Blueprint = Blueprint.make({
  key: MARKDOWN_BLUEPRINT_KEY,
  name: 'Markdown',
  tools: Blueprint.toolDefinitions({ functions }),
  instructions: Template.make({
    source: trim`
            You can create, read and update markdown documents.
            When asked to edit or update documents return updates as a set of compact diff string pairs.
            For each diff, respond with the smallest possible matching span.
          `,
  }),
});

export default () => [
  contributes(Capabilities.Functions, functions),
  contributes(Capabilities.BlueprintDefinition, MarkdownBlueprint),
];
