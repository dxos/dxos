//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { TRANSCRIPT_RULE } from '../internal/stages/extract.ts';
import { FactPipeline } from '../pipeline.ts';
import { FactStore, FactStoreLive } from '../store/index.ts';
import { queuedAiService } from '../testing/index.ts';
import { type ExtractDocument } from '../types/index.ts';
import { extractTranscriptFacts, normalizeEntityId } from './extract-facts.ts';
import { indexFactsBatch } from './index-facts.ts';

const fact = (subject: string, predicate: string, object: string, extra: Record<string, unknown> = {}) => ({
  subject,
  predicate,
  object,
  factuality: 'CT+',
  polarity: '+',
  ...extra,
});

const DOCS: readonly ExtractDocument[] = [
  { text: 'Should Composer use OPFS for storage?', source: 'discord:1000', author: 'alice', date: '2026-06-01T10:00Z' },
  { text: 'DXOS already replicates across peers.', source: 'discord:1001', author: 'bob', date: '2026-06-01T10:05Z' },
  { text: 'Yes, it does: OPFS keeps it durable.', source: 'discord:1002', author: 'carol', date: '2026-06-01T10:10Z' },
];

const layer = (payloads: readonly unknown[], prompts: unknown[]) =>
  FactStoreLive.layerMemory.pipe(Layer.provideMerge(queuedAiService(payloads, prompts)));

describe('batched extraction', () => {
  it.effect(
    'extracts a batch in one request and attributes each fact to the message it cites',
    Effect.fnUntraced(function* () {
      const prompts: unknown[] = [];
      const results = yield* extractTranscriptFacts(DOCS).pipe(
        Effect.provide(
          queuedAiService(
            [
              {
                facts: [
                  // Cited by tag.
                  fact('DXOS', 'replicates across', 'peers', { message: 'm2' }),
                  // A tag in another form a model writes.
                  fact('Composer', 'considers', 'OPFS', { message: '[M1]' }),
                  // A mis-cited tag that the verbatim quote corrects.
                  fact('OPFS', 'keeps', 'data durable', { message: 'm1', quote: 'OPFS keeps it durable' }),
                  // No tag: the quote decides.
                  fact('DXOS', 'supports', 'replication', { quote: 'already replicates across peers' }),
                  // Neither: the batch's last message.
                  fact('Carol', 'agrees with', 'Bob'),
                ],
              },
            ],
            prompts,
          ),
        ),
      );

      expect(prompts).toHaveLength(1);
      const prompt = String(prompts[0]);
      expect(prompt).toContain(TRANSCRIPT_RULE);
      expect(prompt).toContain('<message tag="m1" author="alice" date="2026-06-01T10:00Z">');
      expect(prompt).toContain('<message tag="m3" author="carol" date="2026-06-01T10:10Z">');

      expect(results.map(({ doc }) => doc.source)).toEqual(['discord:1000', 'discord:1001', 'discord:1002']);
      const objects = results.map(({ facts }) =>
        facts.map((fact) => (fact.assertion.object.kind === 'entity' ? fact.assertion.object.label : '')),
      );
      expect(objects).toEqual([['OPFS'], ['peers', 'replication'], ['data durable', 'Bob']]);
      for (const { doc, facts } of results) {
        for (const fact of facts) {
          expect(fact.attribution.source).toBe(doc.source);
          expect(fact.attribution.agent).toBe(normalizeEntityId(doc.author ?? ''));
          expect(fact.attribution.generatedAtTime).toBe(doc.date);
        }
      }
    }),
  );

  it.effect(
    'splits a transcript over the character budget into several requests',
    Effect.fnUntraced(function* () {
      const prompts: unknown[] = [];
      const results = yield* extractTranscriptFacts(DOCS, { maxTranscriptChars: 80 }).pipe(
        Effect.provide(
          queuedAiService(
            [
              { facts: [fact('Composer', 'considers', 'OPFS', { message: 'm1' })] },
              { facts: [fact('Carol', 'agrees with', 'Bob')] },
            ],
            prompts,
          ),
        ),
      );
      expect(prompts).toHaveLength(2);
      // Tags stay those of the whole batch, so the second request still cites m3, and its fallback is its own last.
      expect(String(prompts[1])).toContain('<message tag="m3"');
      expect(String(prompts[1])).not.toContain('<message tag="m1"');
      expect(results[2].facts).toHaveLength(1);
    }),
  );

  it.effect(
    'skips documents whose cursor matches and advances the cursor of the rest',
    Effect.fnUntraced(function* () {
      const prompts: unknown[] = [];
      yield* Effect.gen(function* () {
        const first = yield* indexFactsBatch(DOCS.slice(0, 2));
        expect(first).toHaveLength(2);

        // Only the unseen third message reaches the model.
        const second = yield* indexFactsBatch(DOCS);
        expect(second.map(({ doc }) => doc.source)).toEqual(['discord:1002']);
        expect(String(prompts[1])).not.toContain('Should Composer use OPFS');
        // A lone pending document makes the single-document request.
        expect(String(prompts[1])).toContain('Author: carol');
        expect(String(prompts[1])).not.toContain('<message');

        // Nothing changed: no request at all.
        const third = yield* FactPipeline.runBatch(DOCS);
        expect(third).toHaveLength(0);
        expect(prompts).toHaveLength(2);

        const store = yield* FactStore;
        expect(yield* store.cursor('discord:1002')).toBeDefined();
        expect((yield* store.query({})).length).toBe(2);
      }).pipe(
        Effect.provide(
          layer(
            [
              { facts: [fact('Composer', 'considers', 'OPFS', { message: 'm1' })] },
              { facts: [fact('OPFS', 'keeps', 'data durable', { message: 'm1' })] },
            ],
            prompts,
          ),
        ),
      );
    }),
  );

  it.effect(
    'runBatch makes one request per batch',
    Effect.fnUntraced(function* () {
      const prompts: unknown[] = [];
      const facts = yield* FactPipeline.runBatch(DOCS, { batchSize: 2 }).pipe(
        Effect.provide(
          layer(
            [
              { facts: [fact('DXOS', 'replicates across', 'peers', { message: 'm2' })] },
              { facts: [fact('OPFS', 'keeps', 'data durable', { message: 'm1' })] },
            ],
            prompts,
          ),
        ),
      );
      expect(prompts).toHaveLength(2);
      expect(facts.map((fact) => fact.attribution.source)).toEqual(['discord:1001', 'discord:1002']);
    }),
  );
});
