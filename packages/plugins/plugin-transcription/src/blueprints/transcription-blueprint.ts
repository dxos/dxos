//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { TranscriptionFunctions } from '../functions';

const BLUEPRINT_KEY = 'dxos.org/blueprint/transcription';

const functions = Object.values(TranscriptionFunctions);

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Transcription',
    tools: Blueprint.toolDefinitions({ functions }),
    instructions: Template.make({
      source: trim`
        You can open and summarize a meeting transcript.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  functions,
  make,
};

export default blueprint;
