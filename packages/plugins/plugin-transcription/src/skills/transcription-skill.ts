//
// Copyright 2025 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { TranscriptOperation } from '#types';

const SKILL_KEY = 'org.dxos.skill.transcription';

const make = () =>
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

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
