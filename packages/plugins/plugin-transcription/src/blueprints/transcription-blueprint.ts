//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { TranscriptOperation } from '#operations';

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

const blueprint: Blueprint.Definition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
