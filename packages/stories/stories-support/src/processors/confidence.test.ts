//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { CORPUS } from '../generators/corpus.ts';
import { CANONICAL_DOCUMENTS, passagesOf, toMarkdown } from '../generators/documents.ts';
import { Support } from '../types/index.ts';
import { DEFAULT_THRESHOLD, coverage, decide, findEvidence } from './confidence.ts';
import { actionable, extractFacts, readSentences, sentenceOf } from './facts.ts';
import { terms, topicsOf } from './terms.ts';

const passage = (text: string, title = 'Workers KV'): Support.Passage => ({
  document: `echo:///${title}`,
  title,
  heading: 'Limits',
  text,
});

const evidence = (value: number, text = 'x'): Support.Evidence => ({
  passage: passage(text),
  topics: ['KV'],
  coverage: value,
});

/** Every canonical passage, parsed back from the markdown the space stores. */
const PASSAGES = CANONICAL_DOCUMENTS.flatMap((document) =>
  passagesOf({ document: `echo:///${document.title}`, title: document.title, content: toMarkdown(document) }),
);

describe('terms', () => {
  test('drops stop words and folds plurals', ({ expect }) => {
    expect([...terms('How many subrequests can a Worker make?')]).toEqual(['subrequest', 'worker', 'make']);
    expect(terms('alarms').has('alarm')).toBe(true);
    expect(terms('class').has('class')).toBe(true);
  });

  test('finds topics by name, alias and plural', ({ expect }) => {
    expect(topicsOf('Is a Durable Object alarm retried?')).toEqual(['Durable Objects']);
    expect(topicsOf('our Workers and a KV namespace')).toEqual(['Workers', 'KV']);
    expect(topicsOf('Why did the deploy fail?')).toEqual([]);
  });
});

describe('coverage', () => {
  test('is the share of the question terms the passage contains', ({ expect }) => {
    const limits = passage('The largest value you can store in KV is 25 MiB.');
    expect(coverage('What is the largest value I can store in KV?', limits)).toBe(1);
    expect(coverage('What is the largest key in KV?', limits)).toBeCloseTo(2 / 3);
    expect(coverage('What?', limits)).toBe(0);
  });
});

describe('decide', () => {
  test('a request is always a task, whatever the evidence', ({ expect }) => {
    expect(decide({ kind: 'request', evidence: [evidence(1)] })).toEqual({
      kind: 'task',
      confidence: 0,
      reason: 'request',
    });
  });

  test('a question with no evidence is a task', ({ expect }) => {
    expect(decide({ kind: 'question', evidence: [] })).toEqual({ kind: 'task', confidence: 0, reason: 'no-evidence' });
  });

  test('a question below the threshold is a task', ({ expect }) => {
    expect(decide({ kind: 'question', evidence: [evidence(0.49)] })).toEqual({
      kind: 'task',
      confidence: 0.49,
      reason: 'low-confidence',
    });
  });

  test('a question at the threshold is a draft that cites the best passage', ({ expect }) => {
    const decision = decide({
      kind: 'question',
      evidence: [evidence(DEFAULT_THRESHOLD, 'weaker'), evidence(0.9, 'stronger')],
    });
    expect(decision).toEqual({
      kind: 'draft',
      confidence: 0.9,
      citations: [{ document: 'echo:///Workers KV', title: 'Workers KV', heading: 'Limits', quote: 'stronger' }],
    });
  });

  test('the threshold can be raised', ({ expect }) => {
    expect(decide({ kind: 'question', evidence: [evidence(0.7)] }, { threshold: 0.8 }).kind).toBe('task');
  });
});

describe('findEvidence', () => {
  test('offers only passages of documents about a topic of the message', ({ expect }) => {
    const { topics, evidence: found } = findEvidence({ question: 'What is the largest value in KV?' }, PASSAGES);
    expect(topics).toEqual(['KV']);
    expect(new Set(found.map((entry) => entry.passage.title))).toEqual(new Set(['Workers KV']));
    expect(found[0].passage.heading).toBe('Limits');
  });

  test('takes topics from the rest of the message when the question names none', ({ expect }) => {
    const { topics, evidence: found } = findEvidence(
      { question: 'What is the storage limit per object?', context: 'We are moving to Durable Objects.' },
      PASSAGES,
    );
    expect(topics).toEqual(['Durable Objects']);
    expect(found[0].passage.heading).toBe('Storage');
  });
});

describe('facts', () => {
  test('reads sentences as statements, questions and requests', ({ expect }) => {
    expect(
      readSentences('We use KV. Is it consistent? Please call me. Can you enable it?').map(({ kind }) => kind),
    ).toEqual(['statement', 'question', 'request', 'request']);
  });
});

describe('corpus', () => {
  test.for(CORPUS.map((message) => [message.key, message] as const))(
    '%s has its expected outcomes',
    ([, message], { expect }) => {
      const facts = extractFacts(
        {
          key: message.key,
          text: message.text,
          source: `echo:///${message.key}`,
          created: message.created,
          sender: { email: `${message.from}@example.com` },
        },
        message.facts,
      );
      expect(facts.map(Support.kindOf)).toEqual(message.facts.map(({ kind }) => kind));

      const outcomes = actionable(facts).map((fact) => {
        const kind = Support.kindOf(fact) === 'request' ? 'request' : 'question';
        if (message.fault === 'research' && kind === 'question') {
          return { kind: 'task', reason: 'research-failed' };
        }
        const found = findEvidence({ question: sentenceOf(fact), context: message.text }, PASSAGES);
        const decision = decide({ kind, evidence: found.evidence });
        return decision.kind === 'draft'
          ? { kind: 'draft', document: decision.citations[0].title }
          : { kind: 'task', reason: decision.reason };
      });
      expect(outcomes).toEqual(message.expected);
    },
  );
});
