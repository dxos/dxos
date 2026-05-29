//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { FileOperation } from '../types';

export const BLUEPRINT_KEY = 'org.dxos.blueprint.file';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'File',
    description: 'Read the contents of files (images, videos, PDFs) as File content blocks.',
    tools: Blueprint.toolDefinitions({
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
  });

const blueprint: Blueprint.Definition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
