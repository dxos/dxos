//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Filter, Obj } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';

import { Contract, Researcher } from '../contracts/index.ts';
import { passagesOf } from '../generators/documents.ts';
import { type SupportCapabilities } from '../plugins/index.ts';
import { type Support } from '../types/index.ts';
import { findEvidence } from './confidence.ts';

export type ResearchOptions = {
  /** Questions the search fails for, so a story can show a failed stage. */
  readonly failOn?: (question: string) => boolean;
};

const failure = (message: string, cause?: unknown) =>
  new Contract.ProcessorError({
    message,
    cause,
    context: { contract: Researcher.Researcher.key, method: 'research' },
  });

/** Every headed section of every document in the space. */
export const loadPassages = (
  db: SupportCapabilities.Host['db'],
): Effect.Effect<Support.Passage[], Contract.ProcessorError> =>
  Effect.gen(function* () {
    const documents = yield* Effect.tryPromise({
      try: () => db.query(Filter.type(Markdown.Document)).run(),
      catch: (cause) => failure('Could not list the documents.', cause),
    });
    const passages: Support.Passage[] = [];
    for (const document of documents) {
      const text = yield* Effect.tryPromise({
        try: () => document.content.load(),
        catch: (cause) => failure('Could not read a document.', cause),
      });
      passages.push(
        ...passagesOf({
          document: Obj.getURI(document),
          title: document.name ?? '',
          content: text.content,
        }),
      );
    }
    return passages;
  });

/** Finds evidence for a question by term overlap with the sections of the space's documents: no model, no network. */
export const makeResearcher = (
  { db }: SupportCapabilities.Host,
  { failOn }: ResearchOptions = {},
): Researcher.Implementation => ({
  research: ({ question, context }) =>
    Effect.gen(function* () {
      if (failOn?.(question)) {
        return yield* Effect.fail(failure('The document search timed out.'));
      }
      return findEvidence({ question, context }, yield* loadPassages(db));
    }),
});
