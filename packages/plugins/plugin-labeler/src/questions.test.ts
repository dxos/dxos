//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DecisionModel } from '@dxos/ai-typesafe';

import { NEEDS_REPLY_TRUTH, URGENCY_SCALE, URGENT_SCORE, labelQuestions, toVerdict } from './questions.ts';

describe('labeler questions', () => {
  test('the space tags become the choice criteria, asked alongside the two fixed questions', ({ expect }) => {
    const schema = labelQuestions({ Receipts: 'Receipts', Travel: 'Travel' });

    const questions = DecisionModel.compile(schema);

    expect(Object.keys(questions)).toEqual(['needsReply', 'urgency', 'label']);
    expect(questions.needsReply.question.type).toBe('noul');
    expect(questions.urgency.question).toMatchObject({ type: 'score', criteria: [...URGENCY_SCALE] });
    expect(questions.label.question).toMatchObject({
      type: 'choice',
      criteria: { Receipts: 'Receipts', Travel: 'Travel' },
    });
  });

  test('a label is applied only when the model is confident enough', ({ expect }) => {
    const answers = {
      needsReply: 0.1,
      urgency: { score: 0, confidence: 0.9 },
      label: { _tag: 'Receipts', confidence: 0.9 },
    };

    expect(toVerdict(answers).label).toBe('Receipts');
    // Below the threshold the message keeps no label at all, rather than a guessed one.
    expect(toVerdict({ ...answers, label: { _tag: 'Receipts', confidence: 0.2 } }).label).toBeUndefined();
    expect(toVerdict(answers, 0.95).label).toBeUndefined();
  });

  test('needs-reply and urgent are decided by their own thresholds', ({ expect }) => {
    const base = { needsReply: 0, urgency: { score: 0, confidence: 1 } };

    expect(toVerdict({ ...base, needsReply: NEEDS_REPLY_TRUTH }).needsReply).toBe(true);
    expect(toVerdict({ ...base, needsReply: NEEDS_REPLY_TRUTH - 0.01 }).needsReply).toBe(false);
    expect(toVerdict({ ...base, urgency: { score: URGENT_SCORE, confidence: 1 } }).urgent).toBe(true);
    // A top-of-scale score the model is unsure of is not urgent.
    expect(toVerdict({ ...base, urgency: { score: 2, confidence: 0.1 } }).urgent).toBe(false);
  });

  test('the answers decode into the shape the verdict reads', ({ expect }) => {
    const schema = labelQuestions({ Receipts: 'Receipts' });
    const decoded = Schema.decodeUnknownSync(schema)({
      needsReply: 0.9,
      urgency: { score: 1.8, confidence: 0.7 },
      label: { _tag: 'Receipts', confidence: 0.8 },
    });

    expect(toVerdict(decoded)).toEqual({ label: 'Receipts', needsReply: true, urgent: true });
  });
});
