//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type Decisions,
  NEEDS_REPLY_TRUTH,
  NO_LABEL,
  URGENCY_SCALE,
  URGENT_SCORE,
  labelQuestions,
  toVerdict,
} from './questions.ts';

const rating = (value: number, confidence = 1): Decisions['urgency'] => ({
  rating: value,
  label: URGENCY_SCALE[Math.round(value)],
  probabilities: {},
  confidence,
});

const label = (value: string, confidence?: number, probability = 1): NonNullable<Decisions['label']> => ({
  label: value,
  probabilities: { [value]: probability },
  confidence,
});

describe('labeler questions', () => {
  test('the space tags become the choice criteria, asked alongside the two fixed questions', ({ expect }) => {
    const { decisions } = labelQuestions({ Receipts: 'Receipts' });

    expect(Object.keys(decisions)).toEqual(['needsReply', 'urgency', 'label']);
    expect(decisions.needsReply._tag).toBe('Probability');
    expect(decisions.urgency).toMatchObject({ _tag: 'Rate', criteria: [...URGENCY_SCALE] });
    // A single tag is still a choice: "none of these" is always an option, so the model can decline.
    expect(decisions.label).toMatchObject({
      _tag: 'Classify',
      criteria: { Receipts: 'Receipts', [NO_LABEL]: 'None of these labels fit' },
    });
  });

  test('a label is applied only when the model is confident enough', ({ expect }) => {
    const answers: Decisions = {
      needsReply: { probability: 0.1 },
      urgency: rating(0, 0.9),
      label: label('Receipts', 0.9),
    };

    expect(toVerdict(answers).label).toBe('Receipts');
    // Below the threshold the message keeps no label at all, rather than a guessed one.
    expect(toVerdict({ ...answers, label: label('Receipts', 0.2) }).label).toBeUndefined();
    expect(toVerdict(answers, 0.95).label).toBeUndefined();
  });

  test('with no reported confidence, the probability of the chosen option gates it', ({ expect }) => {
    const base: Decisions = { needsReply: { probability: 0 }, urgency: rating(0) };

    expect(toVerdict({ ...base, label: label('Receipts', undefined, 0.8) }).label).toBe('Receipts');
    expect(toVerdict({ ...base, label: label('Receipts', undefined, 0.3) }).label).toBeUndefined();
  });

  test('choosing "none of these" applies no label however confident', ({ expect }) => {
    expect(
      toVerdict({ needsReply: { probability: 0 }, urgency: rating(0), label: label(NO_LABEL, 1) }).label,
    ).toBeUndefined();
  });

  test('needs-reply and urgent are decided by their own thresholds', ({ expect }) => {
    const base: Decisions = { needsReply: { probability: 0 }, urgency: rating(0) };

    expect(toVerdict({ ...base, needsReply: { probability: NEEDS_REPLY_TRUTH } }).needsReply).toBe(true);
    expect(toVerdict({ ...base, needsReply: { probability: NEEDS_REPLY_TRUTH - 0.01 } }).needsReply).toBe(false);
    expect(toVerdict({ ...base, urgency: rating(URGENT_SCORE) }).urgent).toBe(true);
    // A top-of-scale rating the model is unsure of is not urgent.
    expect(toVerdict({ ...base, urgency: rating(2, 0.1) }).urgent).toBe(false);
  });
});
