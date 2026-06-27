//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Filter, Query, Ref } from '@dxos/echo';
import { type ContentBlock } from '@dxos/types';

import { DEFAULT_STAGE_MODEL } from '../PipelineConfig';
import { type BlockUpdate, type Stage, StageWrite } from '../Stage';

export type ExtractionInput = { window: ContentBlock.Transcript[] };

const STOP_WORDS = new Set([
  'I',
  'Yes',
  'No',
  'But',
  'And',
  'Or',
  'So',
  'They',
  'We',
  'He',
  'She',
  'It',
  'The',
  'A',
  'An',
  'Is',
  'Are',
  'Was',
  'Were',
  'Be',
  'Been',
  'This',
  'That',
]);

/**
 * Deterministic proper-noun heuristic: capitalized word runs, minus sentence-initial stop-words.
 * The LLM seam (see `run`) replaces this with model-driven NER.
 */
export const extractProperNouns = (text: string): string[] => {
  const matches = text.match(/\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\b/g) ?? [];
  return Array.from(new Set(matches.filter((word) => !STOP_WORDS.has(word))));
};

/**
 * Stage ②: surface proper nouns in the newest block, link those that match objects in the space
 * (full-text index), and report the rest as candidates the user can act on.
 */
export const makeExtractionStage = (): Stage<ExtractionInput> => ({
  id: 'extract',
  trigger: 'per-block',
  window: { blocks: 8 },
  concurrency: 'latest-wins',
  model: DEFAULT_STAGE_MODEL,
  run: ({ window }, ctx) =>
    Effect.gen(function* () {
      const index = window.length - 1;
      if (index < 0) {
        return StageWrite.empty();
      }
      const block = window[index];
      const text = block.corrected ?? block.text;
      const nouns = extractProperNouns(text);
      if (nouns.length === 0) {
        return StageWrite.empty();
      }

      const references: Ref.Ref<any>[] = [];
      const matched = new Set<string>();
      if (ctx.db) {
        const db = ctx.db;
        for (const noun of nouns) {
          // TODO(LLM seam): replace heuristic nouns with model NER; swap 'full-text' → 'vector' later.
          const objects = yield* Effect.promise(() =>
            db.query(Query.select(Filter.text(noun, { type: 'full-text' }))).run(),
          );
          if (objects.length > 0) {
            references.push(Ref.make(objects[0]));
            matched.add(noun.toLowerCase());
          }
        }
      }

      const candidates: ContentBlock.Candidate[] = nouns
        .filter((noun) => !matched.has(noun.toLowerCase()))
        .map((noun) => {
          const start = Math.max(0, text.indexOf(noun));
          return { text: noun, kind: 'proper-noun' as const, start, end: start + noun.length };
        });

      const update: BlockUpdate = { index };
      if (references.length > 0) {
        update.references = references;
      }
      if (candidates.length > 0) {
        update.candidates = candidates;
      }
      return StageWrite.blocks([update]);
    }),
});
