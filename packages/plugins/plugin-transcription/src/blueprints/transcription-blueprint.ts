//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { trim } from '@dxos/util';

import { open, summarize } from '../functions';

export const functions: FunctionDefinition[] = [open, summarize];

export const Key = 'dxos.org/blueprint/transcription';

export const make = () =>
  Blueprint.make({
    key: Key,
    name: 'Transcription',
    tools: Blueprint.toolDefinitions({ functions }),
    instructions: Template.make({
      source: trim`
        You can open and summarize a meeting transcript.
      `,
    }),
  });
