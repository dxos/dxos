//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { Obj } from '@dxos/echo';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

describe('Markdown', () => {
  it.effect(
    'draft a document',
    agentTest({
      instructions: trim`
       Draft a new document.
       Pick a title and content yourself.
      `,
      completionCriteria: [
        'A Markdown document object exists in the database.',
        'Agent enabled the markdown blueprint.',
        'Agent used markdown blueprint tools to draft a document.',
      ],
      plugins: [MarkdownPlugin()],
    }),
    { timeout: agentTestTimeout() },
  );
});
