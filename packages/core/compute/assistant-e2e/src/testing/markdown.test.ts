//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { Obj } from '@dxos/echo';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

// Must stay at module scope: primes the test PRNG; agentTest pins a per-test seed from the test name.
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
        'Agent enabled the markdown skill.',
        'Agent used markdown skill tools to draft a document.',
      ],
      plugins: [MarkdownPlugin()],
    }),
    {
      timeout: agentTestTimeout(),
    },
  );

  it.effect(
    'append text to empty document',
    agentTest({
      instructions: trim`
        The database starts empty.
        Enable the markdown skill (key: org.dxos.skill.markdown) using the skill manager.
        Create a new markdown document named "Empty Notes" with empty content (no body text).
        Open the document and confirm its content is empty.

        Use the markdown Update operation (org.dxos.function.markdown.update) to append this exact line
        without providing oldString (omit oldString entirely — do not pass an empty string):
        "Hello from an empty document."

        Open the document again and confirm the content is exactly "Hello from an empty document."
      `,
      completionCriteria: [
        'Agent enabled the markdown skill successfully.',
        'A markdown document was created with initially empty content.',
        'The Update operation completed without error when appending with no oldString.',
        'Final document content is exactly "Hello from an empty document."',
      ],
      plugins: [MarkdownPlugin()],
    }),
    {
      timeout: agentTestTimeout(),
    },
  );
});
