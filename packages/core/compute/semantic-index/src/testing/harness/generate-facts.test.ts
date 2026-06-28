//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateFacts } from './generate-facts';
import { queuedAiService } from '../index';
import { SemanticStore } from '../../SemanticStore';
import { type ExtractDocument } from '../../internal/stages/extract';

// Realistic source text — the input a real connector (Gmail/Discord) would feed in.
const SOURCE_DOCS: readonly ExtractDocument[] = [
  {
    source: 'dxn:gmail:msg-1',
    author: 'Alice',
    date: '2026-06-06T09:00:00.000Z',
    text: "I think I'm probably going to Paris next week.",
  },
  {
    source: 'dxn:gmail:msg-2',
    author: 'Bob',
    date: '2026-06-07T10:00:00.000Z',
    text: "Alice told me she's definitely going to Rome, not Paris.",
  },
  {
    source: 'dxn:gmail:msg-3',
    author: 'Carol',
    date: '2026-06-08T11:00:00.000Z',
    text: 'The Q3 board meeting is confirmed for July 15 in London.',
  },
];

// Per-document structured output: what the LLM (LanguageModel.generateObject) would return for each
// message. The pipeline calls generateObject once per doc (chunk() yields one chunk per short message),
// so the queue is consumed FIFO in document order.
const STUB_PAYLOADS: readonly unknown[] = [
  {
    facts: [
      {
        subject: 'Alice',
        predicate: 'travelsTo',
        object: 'Paris',
        validFrom: '2026-06-12',
        factuality: 'PR+',
        polarity: '+',
        confidence: 0.6,
        nature: 'epistemic',
        quote: "I think I'm probably going to Paris next week.",
      },
    ],
  },
  {
    facts: [
      {
        subject: 'Alice',
        predicate: 'travelsTo',
        object: 'Rome',
        factuality: 'CT+',
        polarity: '+',
        confidence: 0.95,
        quote: "Alice told me she's definitely going to Rome, not Paris.",
      },
    ],
  },
  {
    facts: [
      {
        subject: 'Q3 board meeting',
        predicate: 'scheduledFor',
        object: '2026-07-15',
        factuality: 'CT+',
        polarity: '+',
        quote: 'The Q3 board meeting is confirmed for July 15 in London.',
      },
      {
        subject: 'Q3 board meeting',
        predicate: 'locatedIn',
        object: 'London',
        factuality: 'CT+',
        polarity: '+',
      },
    ],
  },
];

const TestLayer = SemanticStore.layer.pipe(
  Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' })),
  Layer.provideMerge(queuedAiService(STUB_PAYLOADS)),
);

const OUTPUT_PATH = join(dirname(fileURLToPath(import.meta.url)), '../../../temp/facts.generated.ts');

describe('generateFacts', () => {
  it.effect(
    'generates a typed facts module from source text via the real pipeline',
    Effect.fnUntraced(
      function* () {
        const { facts, module } = yield* generateFacts(SOURCE_DOCS);

        // Persist the generated module (gitignored) so it can be inspected / copied into a fixture.
        mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
        writeFileSync(OUTPUT_PATH, module);

        yield* Effect.sync(() => {
          if (facts.length !== 4) {
            throw new Error(`expected 4 facts, got ${facts.length}`);
          }
          for (const needle of ['travelsTo', 'Paris', 'Rome', 'PR+', 'CT+', 'satisfies Type.Fact[]']) {
            if (!module.includes(needle)) {
              throw new Error(`generated module missing ${JSON.stringify(needle)}`);
            }
          }
        });
      },
      Effect.provide(TestLayer),
    ),
  );
});
