//
// Copyright 2025 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { type Database, Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Message } from '@dxos/types';

import { findReferences, insertReferences } from '../quotes';

const EXTRACTION_MODEL = DXN.make('com.anthropic.model.claudeHaiku45');

/**
 * Proper nouns extracted from transcript text.
 */
export const ProperNouns = Schema.Struct({
  properNouns: Schema.Array(Schema.String).annotations({
    description: 'Proper nouns (names of people, organizations, places, products) mentioned in the text.',
  }),
});
export type ProperNouns = Schema.Schema.Type<typeof ProperNouns>;

/**
 * Extracts proper nouns from transcript text using a small LLM (Haiku). Provides the LanguageModel
 * internally so the residual requirement is just {@link AiService.AiService}.
 */
export const extractProperNouns = (text: string) =>
  Effect.gen(function* () {
    const { value } = yield* Effect.scoped(
      LanguageModel.generateObject({
        schema: ProperNouns,
        prompt: [
          'Extract every proper noun (people, organizations, places, products) mentioned in the transcript text below.',
          'Return only the surface strings exactly as they appear. Exclude common nouns and pronouns.',
          '',
          'Transcript:',
          text,
        ].join('\n'),
      }),
    );

    // Drop short tokens (e.g. "IT"): insertReferences replaces case-insensitive substrings, so a
    // short noun would match inside unrelated words ("secur[IT]y") and corrupt neighbouring links.
    return value.properNouns.map((noun) => noun.trim()).filter((noun) => noun.length >= 3);
  }).pipe(Effect.provide(AiService.model(EXTRACTION_MODEL)));

/**
 * Enriches a transcript message: for each transcript block, extracts proper nouns, links them to
 * objects in the space via full-text search, and rewrites the text with `[noun](dxn)` references.
 * Requires {@link AiService.AiService}; takes the space database handle.
 */
export const enrichTranscriptMessage = (message: Message.Message, { db }: { db: Database.Database }) =>
  Effect.gen(function* () {
    const blocks = yield* Effect.forEach(message.blocks, (block) =>
      Effect.gen(function* () {
        if (block._tag !== 'transcript') {
          return block;
        }

        const nouns = yield* extractProperNouns(block.text);
        const references = yield* Effect.promise(() => findReferences([...nouns], db));
        return { ...block, text: insertReferences(block.text, references) };
      }),
    );

    // Preserve the message identity and metadata; enrichment only rewrites transcript block text.
    return Obj.make(Message.Message, {
      id: message.id,
      sender: message.sender,
      created: message.created,
      properties: message.properties,
      blocks,
    });
  });
