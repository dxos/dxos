//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type Answers,
  NEEDS_REPLY_TRUTH,
  NO_LABEL,
  URGENCY_SCALE,
  URGENT_SCORE,
  labelDecisions,
  toVerdict,
} from './questions.ts';

const rated = (rating: number, confidence?: number): Answers['urgency'] => ({
  rating,
  label: URGENCY_SCALE[Math.round(rating)],
  probabilities: {},
  confidence,
});

const labelled = (label: string, confidence?: number): Answers['label'] => ({ label, probabilities: {}, confidence });

describe('labeler questions', () => {
  test('the space tags become the classification criteria, asked alongside the two fixed decisions', ({ expect }) => {
    const { decisions } = labelDecisions({ Receipts: 'Receipts', Travel: 'Travel' });

    expect(Object.keys(decisions)).toEqual(['needsReply', 'urgency', 'label']);
    expect(decisions.needsReply._tag).toBe('Probability');
    expect(decisions.urgency).toMatchObject({ _tag: 'Rate', criteria: [...URGENCY_SCALE] });
    expect(decisions.label).toMatchObject({
      _tag: 'Classify',
      criteria: { Receipts: 'Receipts', Travel: 'Travel', [NO_LABEL]: 'None of these labels fit' },
    });
  });

  test('a single tag is still a valid classification, with "none" as the alternative', ({ expect }) => {
    expect(Object.keys(labelDecisions({ Receipts: 'Receipts' }).decisions.label.criteria)).toEqual([
      'Receipts',
      NO_LABEL,
    ]);
  });

  test('a label is applied only when the model is confident enough', ({ expect }) => {
    const answers: Answers = {
      needsReply: { probability: 0.1 },
      urgency: rated(0, 0.9),
      label: labelled('Receipts', 0.9),
    };

    expect(toVerdict(answers).label).toBe('Receipts');
    // Below the threshold the message keeps no label at all, rather than a guessed one.
    expect(toVerdict({ ...answers, label: labelled('Receipts', 0.2) }).label).toBeUndefined();
    expect(toVerdict({ ...answers, label: labelled('Receipts') }).label).toBeUndefined();
    expect(toVerdict({ ...answers, label: labelled(NO_LABEL, 0.99) }).label).toBeUndefined();
    expect(toVerdict(answers, 0.95).label).toBeUndefined();
  });

  test('needs-reply and urgent are decided by their own thresholds', ({ expect }) => {
    const base: Answers = { needsReply: { probability: 0 }, urgency: rated(0, 1) };

    expect(toVerdict({ ...base, needsReply: { probability: NEEDS_REPLY_TRUTH } }).needsReply).toBe(true);
    expect(toVerdict({ ...base, needsReply: { probability: NEEDS_REPLY_TRUTH - 0.01 } }).needsReply).toBe(false);
    expect(toVerdict({ ...base, urgency: rated(URGENT_SCORE, 1) }).urgent).toBe(true);
    // A top-of-scale rating the model is unsure of is not urgent.
    expect(toVerdict({ ...base, urgency: rated(2, 0.1) }).urgent).toBe(false);
  });
});
