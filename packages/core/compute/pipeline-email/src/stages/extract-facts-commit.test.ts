//
// Copyright 2026 DXOS.org
//

import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { Pipeline } from '@dxos/pipeline';
import { type FactCommit, type RDF } from '@dxos/pipeline-rdf';
import { captureSink } from '@dxos/pipeline/testing';
import { Message } from '@dxos/types';

import { type FactExtractor, extractFactsUnitStage } from './extract-facts-commit';

const ALICE_FACT: RDF.Fact = {
  id: 'fact-1',
  assertion: {
    subject: { entity: 'alice' },
    predicate: 'travelsTo',
    object: { entity: 'paris' },
    validFrom: '2026-06-12',
    quote: "I think I'm probably going to Paris next week",
  },
  factuality: { value: 'PR+', polarity: '+', confidence: 0.6, nature: 'epistemic' },
  attribution: {
    agent: 'alice',
    source: 'dxn:queue:...:msg-1',
    generatedAtTime: '2026-06-06T00:00:00.000Z',
  },
  recordedAt: '2026-06-06T12:00:00.000Z',
  extractor: { id: 'default', model: 'ai.claude.model.claude-haiku-4-5', version: '1' },
  sourceHash: 'abc123',
};

const makeMessage = () =>
  Message.make({
    created: '2001-05-14T10:00:00.000Z',
    sender: { email: 'alice@enron.com' },
    blocks: [{ _tag: 'text', text: 'I will send the Q2 report by Friday.' }],
    properties: { messageId: '<m-1@enron.com>', subject: 'Q2 report' },
  });

describe('extractFactsUnitStage', () => {
  test('emits one FactUnit with the extracted facts and no persistence side effect', async ({ expect }) => {
    const message = makeMessage();
    const extract: FactExtractor = () => Promise.resolve([ALICE_FACT]);

    const { sink, items } = captureSink<FactCommit.FactUnit>();
    await EffectEx.runPromise(
      Stream.fromIterable([message]).pipe(extractFactsUnitStage(extract), Pipeline.run({ sink })),
    );

    expect(items).toHaveLength(1);
    expect(items[0].facts).toEqual([ALICE_FACT]);
    expect(typeof items[0].key).toBe('number');
    expect(typeof items[0].foreignId).toBe('string');
    expect(items[0].foreignId).toBe('<m-1@enron.com>');
  });

  test('degrades to an empty fact list when extraction rejects', async ({ expect }) => {
    const message = makeMessage();
    const extract: FactExtractor = () => Promise.reject(new Error('extraction failed'));

    const { sink, items } = captureSink<FactCommit.FactUnit>();
    await EffectEx.runPromise(
      Stream.fromIterable([message]).pipe(extractFactsUnitStage(extract), Pipeline.run({ sink })),
    );

    expect(items).toHaveLength(1);
    expect(items[0].facts).toEqual([]);
    expect(typeof items[0].key).toBe('number');
    expect(typeof items[0].foreignId).toBe('string');
  });
});
