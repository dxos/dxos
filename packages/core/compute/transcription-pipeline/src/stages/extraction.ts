//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { insertReferences } from '@dxos/assistant/extraction';
import { type Ref } from '@dxos/echo';
import { type ContentBlock } from '@dxos/types';

import { type EntityLookup } from '../lookup';
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

/** Marker that a block's text already carries inline echo links, so extraction can skip it. */
export const isLinked = (text: string): boolean => text.includes('](echo:');

/** Result of resolving a block's proper nouns against the {@link EntityLookup}. */
export type ExtractedEntities = {
  references: Ref.Ref<any>[];
  quotes: { quote: string; id: string }[];
  candidates: ContentBlock.Candidate[];
};

/** Resolve a block's proper nouns: matched → references/quotes, unmatched → candidates. */
export const resolveEntities = async (text: string, lookup?: EntityLookup): Promise<ExtractedEntities> => {
  const nouns = extractProperNouns(text);
  const references: Ref.Ref<any>[] = [];
  const quotes: { quote: string; id: string }[] = [];
  const matched = new Set<string>();
  if (lookup) {
    for (const noun of nouns) {
      // TODO(LLM seam): replace heuristic nouns with model NER, and disambiguate tied candidates
      // against the conversation window (the stage's `window` + `resolvedReferents`) instead of
      // leaving them as candidates. The lookup backend stays injected.
      const candidates = await lookup(noun); // ranked best-first.
      // Auto-link only a clear winner: the top candidate must strictly out-rank the runner-up. A tie
      // at the top is genuine ambiguity, left for the context-aware resolver / the user — so we never
      // link the wrong object on a guess. (Text search returns weak spurious matches too, so counting
      // candidates is not a reliable ambiguity signal; the rank gap is.)
      const unambiguous = candidates.length === 1 || (candidates.length > 1 && candidates[0].score > candidates[1].score);
      if (candidates.length > 0 && unambiguous) {
        references.push(candidates[0].ref);
        quotes.push({ quote: noun, id: candidates[0].id });
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
  return { references, quotes, candidates };
};

/**
 * Rewrite text with inline `[noun](echo:/<id>)` links for entities matched by `lookup`, so markdown
 * consumers decorate them as dx-anchors. Reused by the live recording driver's post-process seam.
 */
export const linkEntities = async (text: string, lookup: EntityLookup): Promise<string> => {
  if (isLinked(text)) {
    return text;
  }
  const { quotes } = await resolveEntities(text, lookup);
  return quotes.length > 0 ? insertReferences(text, { references: quotes }) : text;
};

/**
 * Stage ②: surface proper nouns across the window, link those that match objects (via the injected
 * {@link EntityLookup}), and report the rest as candidates the user can act on.
 *
 * Processes every not-yet-linked block in the window (not just the newest). Under `latest-wins`
 * with a fast stream, earlier per-block invocations are interrupted, so the surviving invocation
 * must cover the whole window — otherwise blocks behind the head never get extracted.
 */
export const makeExtractionStage = (): Stage<ExtractionInput> => ({
  id: 'extract',
  trigger: 'per-block',
  window: { blocks: 8 },
  concurrency: 'latest-wins',
  model: DEFAULT_STAGE_MODEL,
  run: ({ window }, ctx) =>
    Effect.gen(function* () {
      const updates: BlockUpdate[] = [];
      for (let index = 0; index < window.length; index++) {
        const block = window[index];
        const text = block.corrected ?? block.text;
        // Idempotent across windowed re-invocations: already-linked blocks need no further work.
        if (isLinked(text)) {
          continue;
        }
        const { references, quotes, candidates } = yield* Effect.promise(() => resolveEntities(text, ctx.lookup));

        const update: BlockUpdate = { index };
        if (references.length > 0) {
          update.references = references;
        }
        if (candidates.length > 0) {
          update.candidates = candidates;
        }
        // Inline links so markdown consumers render dx-anchors; structured references stay for others.
        if (quotes.length > 0) {
          update.corrected = insertReferences(text, { references: quotes });
        }
        if (update.references || update.candidates || update.corrected) {
          updates.push(update);
        }
      }
      return updates.length > 0 ? StageWrite.blocks(updates) : StageWrite.empty();
    }),
});
