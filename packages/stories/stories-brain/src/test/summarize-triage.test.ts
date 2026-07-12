//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Message } from '@dxos/types';

import { summaryKindFor } from '../testing/harness';

// Deterministic coverage for the summarize-vs-label routing — no fixture / model required (the graded
// summary quality lives in model-ladder.bench.test.ts).

const msg = (sender: { email?: string; name?: string }, properties: Record<string, unknown> = {}) =>
  Message.make({
    created: '2026-01-01T00:00:00.000Z',
    sender,
    blocks: [{ _tag: 'text', text: 'hi' }],
    properties,
  });

describe('summaryKindFor', () => {
  test('person mail earns a full summary', () => {
    expect(summaryKindFor(msg({ email: 'alice@unknown.com', name: 'Alice' }))).toBe('summary');
  });

  test('org / bulk mail gets a one-line label', () => {
    expect(summaryKindFor(msg({ email: 'billing@acme.com' }))).toBe('label');
    expect(summaryKindFor(msg({ email: 'no-reply@acme.com' }))).toBe('label');
    expect(summaryKindFor(msg({ email: 'a@acme.com' }, { listUnsubscribe: '<https://x/unsub>' }))).toBe('label');
  });

  test('an explicit senderClass overrides the heuristic', () => {
    expect(summaryKindFor(msg({ email: 'support@acme.com' }), { senderClass: 'person' })).toBe('summary');
    expect(summaryKindFor(msg({ email: 'alice@unknown.com' }), { senderClass: 'org' })).toBe('label');
  });
});
