//
// Copyright 2025 DXOS.org
//

import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { MarkdownFunctions } from './functions';

const instructions = trim`
  You read, write & create markdown documents.
`;

export const MarkdownBlueprint = Blueprint.make({
  key: 'dxos.org/blueprint/markdown',
  name: 'Markdown',
  description: 'Work with markdown documents.',
  instructions: {
    source: Ref.make(Text.make(instructions)),
  },
  tools: Blueprint.toolDefinitions({
    functions: Object.values(MarkdownFunctions),
  }),
});
