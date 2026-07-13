//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type TopicDraft } from '@dxos/pipeline-email';

import { orderSuggestions } from './suggestions';

const draft = (overrides: Partial<TopicDraft>): TopicDraft => ({
  label: 'topic',
  summary: '',
  threadIds: ['t1'],
  participants: [],
  keywords: [],
  questions: [],
  tasks: [],
  ...overrides,
});

describe('orderSuggestions', () => {
  test('suppresses bulk-dominated clusters', ({ expect }) => {
    const drafts = [
      draft({ label: 'receipts', threadIds: ['r1', 'r2'] }),
      draft({ label: 'q2 report', threadIds: ['q1', 'q2'] }),
    ];
    const result = orderSuggestions({
      drafts,
      bulkThreadIds: new Set(['r1', 'r2']),
      personEmails: new Set(),
      existingLabels: new Set(),
    });
    expect(result.map((entry) => entry.label)).toEqual(['q2 report']);
  });

  test('orders person-linked clusters first (stable otherwise)', ({ expect }) => {
    const drafts = [
      draft({ label: 'org thread', participants: ['team@acme.com'] }),
      draft({ label: 'with alice', participants: ['alice@example.com'] }),
      draft({ label: 'another org', participants: ['sales@acme.com'] }),
    ];
    const result = orderSuggestions({
      drafts,
      bulkThreadIds: new Set(),
      personEmails: new Set(['alice@example.com']),
      existingLabels: new Set(),
    });
    expect(result.map((entry) => entry.label)).toEqual(['with alice', 'org thread', 'another org']);
  });

  test('dedups by label against existing topics/suggestions and within the batch', ({ expect }) => {
    const drafts = [draft({ label: 'q2 report' }), draft({ label: 'q2 report' }), draft({ label: 'launch' })];
    const result = orderSuggestions({
      drafts,
      bulkThreadIds: new Set(),
      personEmails: new Set(),
      existingLabels: new Set(['launch']),
    });
    expect(result.map((entry) => entry.label)).toEqual(['q2 report']);
  });
});
