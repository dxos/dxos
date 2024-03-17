//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import * as Either from 'effect/Either';

import { Document as DocumentType, Thread as ThreadType } from '@braneframe/types';
import { sleep } from '@dxos/async';
import { next as A } from '@dxos/automerge/automerge';
import { getRawDoc } from '@dxos/echo-schema';
import { subscriptionHandler } from '@dxos/functions';
import { log } from '@dxos/log';

import { type ChainVariant, createChainResources } from '../../chain';

const ExtractTermsSignalSchema = S.struct({
  kind: S.literal('suggestion'),
  data: S.struct({
    type: S.literal('dxos.signal.extract-terms'),
    value: S.struct({
      activeObjectId: S.string,
    }),
  }),
});
const ExtractTermsSignalValidator = S.validateEither(ExtractTermsSignalSchema);

export const handler = subscriptionHandler(async ({ event, context, response }) => {
  const space = event.space;
  const signal = Either.getOrNull(ExtractTermsSignalValidator(event.signal));
  if (!space || !signal) {
    return response.status(400);
  }
  const document = space.db.getObjectById(signal.data.value.activeObjectId);
  if (!document || !(document instanceof DocumentType)) {
    log.info('document content not found', { id: signal.data.value.activeObjectId });
    return response.status(200);
  }
  const content = document.content;

  await sleep(500);

  const resources = createChainResources((process.env.DX_AI_MODEL as ChainVariant) ?? 'openai');
  const sequence = RunnableSequence.from([
    { content: () => content.content },
    PromptTemplate.fromTemplate(
      [
        '{content}',
        'List terms that might be of a particular interest to a reader in the above paragraph.',
        'Print every term on a separate line without explanation.',
      ].join('\n'),
    ),
    resources.model,
    new StringOutputParser(),
  ]);
  const textContent = String(content.content).toLowerCase();
  const responseLines = (await sequence.invoke('')).split('\n');
  const terms: string[] = [];
  for (const line of responseLines) {
    const match = line.toLowerCase().match(/\d+\. (.*)/);
    if (match != null && (match[1]?.length ?? 0) > 0) {
      terms.push(match[1].toLowerCase());
    }
  }

  const locatableTerms: Array<[string, number]> = terms
    .map((term) => [term, textContent.indexOf(term)] as [string, number])
    .filter(([, index]) => index >= 0);

  for (const termAndPosition of locatableTerms) {
    const [term, termStart] = termAndPosition;
    const existingHighlight = document.comments.find((comment) => comment.thread?.title === term);
    log.info(`looking for ${term} in`, { comm: document.comments.map((c) => c.thread?.title) });
    if (existingHighlight) {
      continue;
    }
    document.comments.push({
      cursor: encodeCursor(document, term, termStart),
      thread: new ThreadType({
        title: term,
        messages: [],
        context: { space: space.key.toHex(), object: document.id },
      }),
    });
  }

  if (locatableTerms.length > 0) {
    log.info('terms extracted', { terms: locatableTerms.slice(0, 5), length: locatableTerms.length });
  } else {
    log.info('failed to extract terms', { inputLength: content.content?.length, modelOutput: responseLines });
  }

  return response.status(200);
});

const encodeCursor = (document: DocumentType, term: string, termStart: number): string | undefined => {
  const accessor = getRawDoc(document.content, ['content']);
  const doc = accessor.handle.docSync();
  if (!doc) {
    return undefined;
  }
  const start = A.getCursor(doc, accessor.path.slice(), termStart);
  const end = A.getCursor(doc, accessor.path.slice(), termStart + term.length);
  return `${start}:${end}`;
};
