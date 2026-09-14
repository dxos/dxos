//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { Database, Filter, Query } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import { trim } from '@dxos/util';

import { findObject } from '../assertions.ts';
import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';

// Ported from the gated `Markdown` scenarios (../testing/markdown.test.ts).
// Grades the DB effect directly instead of the agent's self-reported `completedCriteria`.

const DRAFT_SCORERS = [
  Scorer.database({
    name: 'document-created',
    description: 'A Markdown Document object exists in the DB after the run.',
    query: Query.select(Filter.type(Markdown.Document)),
    score: (documents) => documents.length > 0,
  }),
];

const draftTask = createEvalRunner({
  instructions: trim`
    Draft a new document.
    Pick a title and content yourself.
  `,
  input: Schema.Unknown,
  output: Schema.Unknown,
  plugins: [MarkdownPlugin.make()],
  scored: true,
});

evalite('Markdown — draft a document', {
  data: [{ input: null }],
  trialCount: 3,
  task: draftTask,
  scorers: Scorer.toEvalite(DRAFT_SCORERS),
});

const DOCUMENT_NAME = 'Empty Notes';
const APPENDED_LINE = 'Hello from an empty document.';

/** The document's final text, read back outside the agent. */
const documentText = Effect.gen(function* () {
  const document = yield* findObject(Markdown.Document, (candidate) => candidate.name === DOCUMENT_NAME);
  if (!document) {
    return undefined;
  }
  const text = yield* Database.load(document.content);
  return text.content;
});

const APPEND_SCORERS = [
  Scorer.make({
    name: 'content-matches',
    description: `The "${DOCUMENT_NAME}" document's final content is exactly the appended line.`,
    score: documentText.pipe(Effect.map((content) => content === APPENDED_LINE)),
  }),
];

const appendTask = createEvalRunner({
  instructions: trim`
    The database starts empty.
    Create a new markdown document named "${DOCUMENT_NAME}" with empty content (no body text).
    Open the document and confirm its content is empty.

    Use the markdown Update operation (org.dxos.operation.markdown.update) to append this exact line
    without providing oldString (omit oldString entirely — do not pass an empty string):
    "${APPENDED_LINE}"

    Open the document again and confirm the content is exactly "${APPENDED_LINE}"
  `,
  input: Schema.Unknown,
  output: Schema.Unknown,
  plugins: [MarkdownPlugin.make()],
  scored: true,
});

evalite('Markdown — append text to empty document', {
  data: [{ input: null }],
  trialCount: 3,
  task: appendTask,
  scorers: Scorer.toEvalite(APPEND_SCORERS),
});
