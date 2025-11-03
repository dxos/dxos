//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { Blueprint, Template } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { trim } from '@dxos/util';

import { open, summarize } from '../functions';

const functions: FunctionDefinition[] = [open, summarize];

export default () => [
  contributes(Capabilities.Functions, functions),
  contributes(
    Capabilities.BlueprintDefinition,
    Blueprint.make({
      key: 'dxos.org/blueprint/transcription',
      name: 'Transcription',
      tools: Blueprint.toolDefinitions({ functions }),
      instructions: Template.make({
        source: trim`
            You can open and summarize a meeting transcript.
          `,
      }),
    }),
  ),
];
