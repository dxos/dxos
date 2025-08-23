//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { Blueprint, Template } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { trim } from '@dxos/util';

const functions: FunctionDefinition[] = [];
const tools = ['load-document'];

// TODO(burdon): Diff message format (xml).

export default () => {
  return [
    contributes(Capabilities.Functions, functions),
    contributes(
      Capabilities.BlueprintDefinition,
      Blueprint.make({
        key: 'dxos.org/blueprint/markdown',
        name: 'Markdown',
        tools: Blueprint.toolDefinitions({ functions, tools }),
        instructions: Template.make({
          source: trim`
            You can create and update markdown documents.
            When asked to edit documents, return updates using the diff format.
          `,
        }),
      }),
    ),
  ];
};
