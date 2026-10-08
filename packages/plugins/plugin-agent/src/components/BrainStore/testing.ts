//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { type RDF } from '@dxos/pipeline-rdf';
import { Person } from '@dxos/types';

import { type TriggerOperation } from '#types';

export const AGENT = 'kai';
export const ALICE = 'did:key:z6MkAlice';
export const BOB = 'did:key:z6MkBob';

/** Names the fixture's members, as `labelOf` does for a space's members. */
export const label = (id: string): string => (id === ALICE ? 'Alice' : id === BOB ? 'Bob' : id);

const fact = (
  id: string,
  {
    speaker,
    quote,
    predicate,
    object,
    saidAt,
  }: { speaker: string; quote: string; predicate: string; object: string; saidAt: string },
): RDF.Fact => ({
  id,
  assertion: {
    subject: { kind: 'entity', entity: speaker, label: label(speaker) },
    predicate,
    object: { kind: 'literal', literal: object },
    quote,
  },
  factuality: { value: 'CT+', polarity: '+', confidence: 0.9 },
  illocution: { force: 'commissive', mood: 'declarative' },
  attribution: {
    agent: speaker,
    agentLabel: label(speaker),
    source: `dxn:queue:chat:${id}`,
    generatedAtTime: saidAt,
  },
  recordedAt: saidAt,
  extractor: { id: 'default', model: 'test', version: '1' },
  sourceHash: id,
});

export const FACTS: RDF.Fact[] = [
  fact('fact-1', {
    speaker: BOB,
    quote: 'I am working on the indexer migration.',
    predicate: 'works on',
    object: 'indexer migration',
    saidAt: '2026-10-07T10:30:00.000Z',
  }),
  fact('fact-2', {
    speaker: BOB,
    quote: 'The indexer PR is up for review.',
    predicate: 'opened',
    object: 'indexer PR',
    saidAt: '2026-10-07T11:45:00.000Z',
  }),
  fact('fact-3', {
    speaker: ALICE,
    quote: 'I will review it this afternoon.',
    predicate: 'will review',
    object: 'indexer PR',
    saidAt: '2026-10-07T11:50:00.000Z',
  }),
];

const COMPILED_RULES = [
  'achieved(goal) :- speaker(F, "did:key:z6MkBob"), about(F, "indexer PR"), force(F, assertive).',
  'wake(nudge) :- not achieved(goal), elapsed(goal, 1d).',
].join('\n');

/**
 * Two subscriptions: Alice's ongoing watch on Bob (a translated pattern, two events pending) and a goal whose rules
 * were compiled from its text, with nothing pending. Built per call, as refs need fresh objects.
 */
export const makeSnapshot = (): TriggerOperation.BrainSnapshot => {
  const alice = Ref.make<Obj.Unknown>(Obj.make(Person.Person, { fullName: 'Alice' }));
  return {
    facts: FACTS,
    subscriptions: [
      {
        trigger: {
          id: `${AGENT}.watch-bob`,
          agent: AGENT,
          request: 'What is Bob working on? Keep me posted.',
          when: { speaker: BOB, about: 'indexer' },
          then: { _tag: 'notify', recipient: alice, message: 'Update on Bob: {fact}' },
          ongoing: true,
          createdAt: '2026-10-07T09:00:00.000Z',
        },
        pending: [
          {
            id: 'event-1',
            subscription: `${AGENT}.watch-bob`,
            label: 'match',
            facts: [FACTS[0]],
            at: '2026-10-07T10:30:01.000Z',
          },
          {
            id: 'event-2',
            subscription: `${AGENT}.watch-bob`,
            label: 'match',
            facts: [FACTS[1]],
            at: '2026-10-07T11:45:01.000Z',
          },
        ],
      },
      {
        trigger: {
          id: `${AGENT}.indexer-pr`,
          agent: AGENT,
          when: { speaker: BOB, about: 'indexer PR' },
          then: { _tag: 'notify', recipient: alice, message: "Bob's indexer PR is up." },
          rules: COMPILED_RULES,
          createdAt: '2026-10-07T09:00:00.000Z',
        },
        pending: [],
      },
    ],
    nextDueAt: '2026-10-08T09:00:00.000Z',
  };
};
