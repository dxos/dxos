//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { TranscriptOperation } from '../operations';

const BLUEPRINT_KEY = 'org.dxos.blueprint.transcription';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Transcription',
    tools: Blueprint.toolDefinitions({ operations: [TranscriptOperation.Open, TranscriptOperation.Summarize] }),
    instructions: Template.make({
      source: trim`
        You can open and summarize a meeting transcript.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
