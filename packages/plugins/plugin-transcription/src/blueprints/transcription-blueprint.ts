//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { Open, Summarize, TranscriptionHandlers } from '../functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.transcription';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Transcription',
    tools: Blueprint.toolDefinitions({ operations: [Open, Summarize] }),
    instructions: Template.make({
      source: trim`
        You can open and summarize a meeting transcript.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  operations: TranscriptionHandlers,
  make,
};

export default blueprint;
