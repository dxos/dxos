//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';

import { SemanticIndexError } from './errors';
import { type Fact } from './types';
import { SemanticStore } from './SemanticStore';
import { chunk } from './internal/stages/chunk';
import { DEFAULT_MODEL, type ExtractDocument, extractChunk } from './internal/stages/extract';

export type { ExtractDocument } from './internal/stages/extract';

// PROVISIONAL v1 entity resolution: distinct surface forms that normalize identically will merge,
// and there is no linking to real ECHO objects yet. Not the final identity scheme.
const slug = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const factId = (source: string, index: number) => `${source}#${index}`;
const EPOCH = new Date(0).toISOString();

export const SemanticPipeline = {
  /** Extract → link (slug) → persist for each document. */
  run: (
    docs: readonly ExtractDocument[],
  ): Effect.Effect<Fact[], SemanticIndexError, SemanticStore | AiService.AiService> =>
    Effect.gen(function* () {
      const store = yield* SemanticStore;
      const allFacts: Fact[] = [];
      for (const doc of docs) {
        const chunks = chunk(doc.text);
        let index = 0;
        for (const _text of chunks) {
          const payload = yield* extractChunk(doc);
          for (const candidate of payload.facts) {
            const fact: Fact = {
              id: factId(doc.source, index++),
              assertion: {
                subject: { entity: slug(candidate.subject) },
                predicate: candidate.predicate,
                object: { entity: slug(candidate.object) },
                ...(candidate.validFrom ? { validFrom: candidate.validFrom } : {}),
                ...(candidate.validTo ? { validTo: candidate.validTo } : {}),
                ...(candidate.quote ? { quote: candidate.quote } : {}),
              },
              valence: {
                factuality: candidate.factuality,
                polarity: candidate.polarity,
                ...(candidate.confidence !== undefined ? { confidence: candidate.confidence } : {}),
                ...(candidate.nature ? { nature: candidate.nature } : {}),
              },
              attribution: {
                ...(doc.author ? { agent: slug(doc.author) } : {}),
                source: doc.source,
                generatedAtTime: doc.date ?? EPOCH,
              },
              recordedAt: EPOCH,
              extractor: { id: 'default', model: DEFAULT_MODEL, version: '1' },
              sourceHash: '',
            };
            allFacts.push(fact);
          }
        }
      }
      yield* store.putFacts(allFacts);
      return allFacts;
    }),
};
