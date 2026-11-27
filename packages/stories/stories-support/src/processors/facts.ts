//
// Copyright 2026 DXOS.org
//

import { Fact } from '@dxos/echo-memory';

import { type RecordedFact } from '../generators/corpus.ts';
import { Support } from '../types/index.ts';

/** What fact extraction needs to know about a message. */
export type FactSource = {
  /** Stable key the fact ids derive from, so a re-run writes the same facts. */
  readonly key: string;
  readonly text: string;
  /** The message's URI, stored as each fact's provenance. */
  readonly source: string;
  readonly created: string;
  readonly sender: { readonly email: string; readonly name?: string };
};

const EXTRACTOR = { id: 'org.dxos.stories.support', model: 'recorded', version: '1' };

/** An entity key for a name: lowercased words joined by hyphens. */
export const slug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** The sender's entity key: the `mailto:` IRI a Person's address also yields. */
export const senderKey = (email: string): string => `mailto:${email.toLowerCase()}`;

const REQUEST = /^(please\b|(can|could|would|will) you\b)/i;

/**
 * Reads a text's sentences as facts when no extraction was recorded for it: a sentence that asks the reader to act is a
 * request, one ending in `?` a question, and any other a statement.
 */
export const readSentences = (text: string): RecordedFact[] =>
  text
    .split(/(?<=[.?!])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
    .map((sentence): RecordedFact =>
      REQUEST.test(sentence)
        ? { kind: 'request', text: sentence }
        : sentence.endsWith('?')
          ? { kind: 'question', text: sentence }
          : { kind: 'statement', text: sentence, subject: '', predicate: 'says', object: sentence },
    );

const base = ({ key, source, created, sender }: FactSource, index: number) => ({
  id: `support:${key}:${index}`,
  factuality: { value: 'CT+', polarity: '+', confidence: 1 } as const,
  attribution: {
    agent: senderKey(sender.email),
    agentLabel: sender.name,
    source,
    generatedAtTime: created,
  },
  recordedAt: created,
  extractor: EXTRACTOR,
  sourceHash: key,
});

/**
 * A message's facts. A question or request has the sender as subject and the sentence as a literal object; a statement
 * is its recorded triple. `recorded` stands in for a model's extraction; without it the sentence rule is used.
 */
export const extractFacts = (source: FactSource, recorded?: readonly RecordedFact[]): Fact.Fact[] => {
  const sender: Fact.EncodedEntityTerm = {
    kind: 'entity',
    entity: senderKey(source.sender.email),
    label: source.sender.name,
    type: 'person',
  };
  return (recorded ?? readSentences(source.text)).map((fact, index) => {
    if (fact.kind === 'statement') {
      return Fact.make({
        ...base(source, index),
        assertion: {
          subject: fact.subject ? { kind: 'entity', entity: slug(fact.subject), label: fact.subject } : sender,
          predicate: fact.predicate,
          object:
            fact.object === fact.text
              ? { kind: 'literal', literal: fact.object }
              : { kind: 'entity', entity: slug(fact.object), label: fact.object },
          quote: fact.text,
        },
      });
    }
    return Fact.make({
      ...base(source, index),
      assertion: {
        subject: sender,
        predicate: fact.kind === 'question' ? 'asks' : 'requests',
        object: { kind: 'literal', literal: fact.text },
        quote: fact.text,
      },
      illocution: { force: 'directive', mood: fact.kind === 'question' ? 'interrogative' : 'imperative' },
    });
  });
};

/** A fact recording that the sender's message mentions a topic. */
export const mentionFact = (source: FactSource, topic: string): Fact.Fact =>
  Fact.make({
    ...base(source, 0),
    id: `support:${source.key}:mentions:${slug(topic)}`,
    assertion: {
      subject: { kind: 'entity', entity: senderKey(source.sender.email), label: source.sender.name, type: 'person' },
      predicate: 'mentions',
      object: { kind: 'entity', entity: slug(topic), label: topic, type: 'concept' },
    },
  });

/** The sentence a question or request fact carries. */
export const sentenceOf = (fact: Fact.Fact): string => Fact.termText(fact.assertion.object);

/** The facts that need an outcome: questions and requests, in order. */
export const actionable = (facts: readonly Fact.Fact[]): Fact.Fact[] =>
  facts.filter((fact) => Support.kindOf(fact) !== 'statement');
