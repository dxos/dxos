//
// Copyright 2026 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { FileOperation } from '../types';

export const SKILL_KEY = 'org.dxos.skill.file';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'File',
    description: 'Read the contents of files (images, videos, PDFs) as File content blocks.',
    tools: Skill.toolDefinitions({
      operations: [FileOperation.Read],
    }),
    instructions: Template.make({
      source: trim`
        {{! File }}

        You can read the contents of files.
        Calling the read tool returns the file contents as a File content block (a data URL for
        inline files, the original URL for external files). The model receives the file natively
        and can describe, transcribe, or otherwise reason over its contents.
      `,
    }),
    agentCanEnable: true,
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
