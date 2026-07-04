//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { afterAll, describe, test } from 'vitest';

import { SemanticStore, type Type, normalizeEntityId } from '@dxos/semantic-index';

import { commitmentLedger } from './ledger';

// Hand-built facts: two commitments (one with a deadline) and one plain statement.
const fact = (
  id: string,
  subject: string,
  predicate: string,
  object: string,
  extra?: { validTo?: string; confidence?: number },
): Type.Fact => ({
  id,
  assertion: {
    subject: { entity: normalizeEntityId(subject), label: subject },
    predicate,
    object: { entity: normalizeEntityId(object), label: object },
    ...(extra?.validTo ? { validTo: extra.validTo } : {}),
  },
  valence: {
    factuality: 'CT+',
    polarity: '+',
    ...(extra?.confidence !== undefined ? { confidence: extra.confidence } : {}),
  },
  attribution: { source: `<${id}@enron.com>`, generatedAtTime: '2001-05-01T10:00:00.000Z' },
  recordedAt: '2001-05-01T10:00:00.000Z',
  extractor: { id: 'test', model: 'test', version: '1' },
  sourceHash: `h-${id}`,
});

const FACTS: Type.Fact[] = [
  fact('m1', 'alice@enron.com', 'will send', 'Q2 report', { validTo: '2001-05-18' }),
  fact('m2', 'bob@enron.com', 'owes', 'budget confirmation'),
  fact('m3', 'alice@enron.com', 'works at', 'Enron'),
];

const runtime = ManagedRuntime.make(SemanticStore.layerMemory.pipe(Layer.provideMerge(Layer.empty)));

describe('commitmentLedger', () => {
  afterAll(async () => {
    await runtime.dispose();
  });

  test('collects commitment facts by predicate, ignoring plain statements', async ({ expect }) => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const store = yield* SemanticStore;
        yield* store.putFacts(FACTS);
      }),
    );

    const commitments = await runtime.runPromise(
      Effect.gen(function* () {
        const store = yield* SemanticStore;
        return yield* commitmentLedger(store);
      }),
    );

    expect(commitments).toHaveLength(2);
    const send = commitments.find((commitment) => commitment.what === 'Q2 report');
    expect(send?.who).toBe('alice@enron.com');
    expect(send?.dueBy).toBe('2001-05-18');
    expect(send?.source).toBe('<m1@enron.com>');
    expect(commitments.some((commitment) => commitment.what === 'Enron')).toBe(false);
  });

  test('custom predicates narrow the ledger', async ({ expect }) => {
    const commitments = await runtime.runPromise(
      Effect.gen(function* () {
        const store = yield* SemanticStore;
        return yield* commitmentLedger(store, { predicates: ['owes'] });
      }),
    );
    expect(commitments).toHaveLength(1);
    expect(commitments[0].who).toBe('bob@enron.com');
  });
});
