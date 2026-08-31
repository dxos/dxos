//
// Copyright 2025 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { TranscriptOperation } from '#types';

const SKILL_KEY = 'org.dxos.skill.transcription';

export const key = SKILL_KEY;

export const make = (): Skill.Skill =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Transcription',
    tools: Skill.toolDefinitions({ operations: [TranscriptOperation.Open, TranscriptOperation.Summarize] }),
    instructions: Template.make({
      source: trim`
        You can open and summarize a meeting transcript.
      `,
    }),
  });
