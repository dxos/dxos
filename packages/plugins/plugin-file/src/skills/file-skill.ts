//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { FileOperation } from '#types';

export const SKILL_KEY = 'org.dxos.skill.file';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'File',
    description: 'Read the contents of files (images, videos, PDFs), and add new files to a space.',
    tools: Skill.toolDefinitions({
      operations: [FileOperation.Read, FileOperation.CreateFromSource],
    }),
    instructions: Template.make({
      source: trim`
        {{! File }}

        You can read the contents of files.
        Calling the ${Operation.toolName(FileOperation.Read)} tool returns the file contents as a File content block (a data URL for
        inline files, the original URL for external files). The model receives the file natively
        and can describe, transcribe, or otherwise reason over its contents.

        You can also add a file to the space with the ${Operation.toolName(FileOperation.CreateFromSource)} tool, from one of two sources:
        - \`{ "type": "http", "url": "https://..." }\` when the content is already reachable at a URL.
          Prefer this whenever it applies: the bytes are fetched by the host and never pass through
          the conversation. The URL must be https and must not point at a private address.
        - \`{ "type": "base64", "mediaType": "image/png", "data": "..." }\` when you hold the bytes
          yourself, such as an image you generated. Keep this under 1MB — the encoded payload counts
          against the conversation, so a large file is slow and expensive before it is anything else.

        Images, video, PDFs, and plain text, CSV, Markdown and JSON are accepted. HTML is not.
        Always pass the true media type of the content; do not infer it from a file extension.
      `,
    }),
    agentCanEnable: true,
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
