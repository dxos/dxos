//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { Database } from '@dxos/echo';
import { Markdown } from '@dxos/plugin-markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { trim } from '@dxos/util';

import { findObject, objectExists } from '../assertions';
import { createEvalRunner } from '../runner';

// Ported from the gated `Markdown` scenarios (../testing/markdown.test.ts).
// Grades the DB effect directly instead of the agent's self-reported `completedCriteria`.

const draftTask = createEvalRunner({
  instructions: trim`
    Draft a new document.
    Pick a title and content yourself.
  `,
  input: Schema.Unknown,
  output: Schema.Unknown,
  plugins: [MarkdownPlugin()],
  dbQuery: () => objectExists(Markdown.Document, () => true),
});

evalite('Markdown — draft a document', {
  data: [{ input: null }],
  task: draftTask,
  scorers: [
    {
      name: 'document-created',
      description: 'A Markdown Document object exists in the DB after the run.',
      scorer: ({ output }) => (output.dbQuery ? 1 : 0),
    },
  ],
});

const appendTask = createEvalRunner({
  instructions: trim`
    The database starts empty.
    Create a new markdown document named "Empty Notes" with empty content (no body text).
    Open the document and confirm its content is empty.

    Use the markdown Update operation (org.dxos.function.markdown.update) to append this exact line
    without providing oldString (omit oldString entirely — do not pass an empty string):
    "Hello from an empty document."

    Open the document again and confirm the content is exactly "Hello from an empty document."
  `,
  input: Schema.Unknown,
  output: Schema.Unknown,
  plugins: [MarkdownPlugin()],
  dbQuery: () =>
    Effect.gen(function* () {
      const doc = yield* findObject(Markdown.Document, (d) => d.name === 'Empty Notes');
      if (!doc) {
        return undefined;
      }
      const text = yield* Database.load(doc.content);
      return text.content;
    }),
});

evalite('Markdown — append text to empty document', {
  data: [{ input: null }],
  task: appendTask,
  scorers: [
    {
      name: 'content-matches',
      description: 'The "Empty Notes" document\'s final content is exactly the appended line.',
      scorer: ({ output }) => (output.dbQuery === 'Hello from an empty document.' ? 1 : 0),
    },
  ],
});
