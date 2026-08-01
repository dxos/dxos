//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message } from '@dxos/types';

import { type TagResult } from './stages/tag';
import { runTopicsPipeline } from './topics-pipeline';

const OWNER = 'me@x.com';
const NOW = '2026-01-10T00:00:00.000Z';

const msg = (subject: string, from: string, created: string, summary?: string) =>
  Message.make({
    created,
    sender: { email: from },
    blocks: [{ _tag: 'text', text: 'body' }],
    properties: { subject, messageId: `<${from}:${created}>`, ...(summary ? { summary } : {}) },
  });

// Deterministic messages: two related "Q2 report" threads + one unrelated invoice.
const messages = () => [
  msg('Q2 report draft', 'alice@x.com', '2026-01-01T10:00:00.000Z', 'Draft circulated.'),
  msg('RE: Q2 report draft', OWNER, '2026-01-01T11:00:00.000Z', 'Comments sent.'),
  msg('Q2 report budget', 'alice@x.com', '2026-01-02T10:00:00.000Z', 'Budget attached.'),
  msg('Invoice #A3F9B2 from Acme', 'billing@acme.com', '2026-01-03T10:00:00.000Z'),
];

const stubTag = async (): Promise<TagResult> => ({ tags: ['work'], spam: false, bulk: false });
const stubSummarize = async (): Promise<string> => 'A topic summary.';

describe('runTopicsPipeline', () => {
  test('tags every message and returns summarized topic drafts', async ({ expect }) => {
    const result = await runTopicsPipeline(
      { messages: messages(), ownerEmail: OWNER, now: NOW },
      {
        tag: stubTag,
        summarize: stubSummarize,
      },
    );
    expect(result.messageTags).toHaveLength(4);
    expect(result.messageTags.every((entry) => entry.tags.includes('work'))).toBe(true);
    expect(result.topicDrafts.length).toBeGreaterThan(0);
    expect(result.topicDrafts.every((draft) => draft.summary === 'A topic summary.')).toBe(true);
  });

  test('limit + skipMessage bound tagging (resumable-lite)', async ({ expect }) => {
    const already = new Set(['<alice@x.com:2026-01-01T10:00:00.000Z>']);
    const result = await runTopicsPipeline(
      { messages: messages(), ownerEmail: OWNER, now: NOW, limit: 2, skipMessage: (id) => already.has(id) },
      { tag: stubTag, summarize: stubSummarize },
    );
    // 4 messages − 1 skipped = 3 pending, capped at 2.
    expect(result.messageTags).toHaveLength(2);
    expect(result.messageTags.some((entry) => already.has(entry.messageId))).toBe(false);
  });

  test('skipTopic omits already-materialized topics', async ({ expect }) => {
    const all = await runTopicsPipeline(
      { messages: messages(), ownerEmail: OWNER, now: NOW },
      {
        tag: stubTag,
        summarize: stubSummarize,
      },
    );
    const firstLabel = all.topicDrafts[0].label;
    const result = await runTopicsPipeline(
      { messages: messages(), ownerEmail: OWNER, now: NOW, skipTopic: (label) => label === firstLabel },
      { tag: stubTag, summarize: stubSummarize },
    );
    expect(result.topicDrafts.some((draft) => draft.label === firstLabel)).toBe(false);
    expect(result.topicDrafts.length).toBe(all.topicDrafts.length - 1);
  });

  test('keepTopic drops clusters with no known-person participant', async ({ expect }) => {
    // Only alice is a known person; the billing@acme thread is dropped.
    const known = new Set(['alice@x.com']);
    const result = await runTopicsPipeline(
      {
        messages: messages(),
        ownerEmail: OWNER,
        now: NOW,
        keepTopic: (draft) => draft.participants.some((email) => known.has(email)),
      },
      { tag: stubTag, summarize: stubSummarize },
    );
    expect(result.topicDrafts.length).toBeGreaterThan(0);
    expect(result.topicDrafts.every((draft) => draft.participants.includes('alice@x.com'))).toBe(true);
    expect(result.topicDrafts.some((draft) => draft.participants.includes('billing@acme.com'))).toBe(false);
    // Tagging is unaffected by the topic gate — every message is still tagged.
    expect(result.messageTags).toHaveLength(4);
  });
});
