//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { Pipeline } from '@dxos/pipeline';
import { captureSink } from '@dxos/pipeline/testing';
import { SemanticPipeline, SemanticStore, type Type } from '@dxos/semantic-index';
import { mockAiService } from '@dxos/semantic-index/testing';
import { Message } from '@dxos/types';

import { type FactIndexer, extractFactsStage } from './extract-stage';
import { EMAIL_EXTRACT_OPTIONS, messageToDocument } from './facts';

// One fact per message from the mock LLM; proves the stage persists into the store.
const LLM_OUTPUT = {
  facts: [
    {
      subject: 'alice@enron.com',
      predicate: 'will send',
      object: 'Q2 report',
      validTo: '2001-05-18',
      factuality: 'CT+',
      polarity: '+',
      quote: 'I will send the Q2 report by Friday.',
    },
  ],
};

describe('extractFactsStage', () => {
  test('extracts and persists a fact per message into the store', async ({ expect }) => {
    const runtime = ManagedRuntime.make(SemanticStore.layerMemory.pipe(Layer.provideMerge(mockAiService(LLM_OUTPUT))));
    const indexFacts: FactIndexer = (message) =>
      runtime.runPromise(SemanticPipeline.run([messageToDocument(message)], EMAIL_EXTRACT_OPTIONS));

    const message = Message.make({
      created: '2001-05-14T10:00:00.000Z',
      sender: { email: 'alice@enron.com' },
      blocks: [{ _tag: 'text', text: 'I will send the Q2 report by Friday.' }],
      properties: { messageId: '<m-1@enron.com>', subject: 'Q2 report' },
    });

    const { sink, items } = captureSink<Message.Message>();
    await EffectEx.runPromise(
      Stream.fromIterable([message]).pipe(extractFactsStage(indexFacts), Pipeline.run({ sink })),
    );

    // The Message passes through unchanged.
    expect(items).toHaveLength(1);

    // The fact was persisted; read it back from the same store.
    const facts: Type.Fact[] = await runtime.runPromise(
      Effect.gen(function* () {
        const store = yield* SemanticStore;
        return yield* store.query({});
      }),
    );
    await runtime.dispose();

    expect(facts.length).toBeGreaterThan(0);
    const { object } = facts[0].assertion;
    // Extraction always produces an entity-ref Term (never a literal), so `label` is present here.
    expect('entity' in object).toBe(true);
    expect('entity' in object && object.label).toBe('Q2 report');
    expect(facts[0].valence.factuality).toBe('CT+');
    expect(facts[0].attribution.source).toBe('<m-1@enron.com>');
  });
});
