//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

import { buildThreads } from './threads';
import { clusterThreads, materializeTopics, summarizeTopics } from './topics';
import { Topic } from './types';

const OWNER = 'me@enron.com';
const NOW = '2001-05-02T00:00:00.000Z';

describe('topics', () => {
  test('clusters related threads and separates unrelated ones', ({ expect }) => {
    const drafts = clusterThreads(threads());
    expect(drafts).toHaveLength(2);

    const q2 = drafts.find((draft) => draft.threadIds.includes('q2 report draft'));
    expect(q2?.threadIds).toContain('q2 report budget numbers');
    expect(q2?.participants).toContain('alice@enron.com');
    expect(q2?.keywords).toContain('report');

    const lunch = drafts.find((draft) => draft.threadIds.includes('lunch on friday?'));
    expect(lunch?.threadIds).toHaveLength(1);
  });

  test('every thread lands in exactly one topic', ({ expect }) => {
    const input = threads();
    const drafts = clusterThreads(input);
    const assigned = drafts.flatMap((draft) => draft.threadIds);
    expect(assigned.sort()).toEqual(input.map((thread) => thread.threadId).sort());
  });

  test('deterministic summary concatenates thread summaries; label from top keywords', ({ expect }) => {
    const drafts = clusterThreads(threads());
    const q2 = drafts.find((draft) => draft.threadIds.includes('q2 report draft'));
    expect(q2?.summary).toContain('Draft circulated.');
    expect(q2?.label.length).toBeGreaterThan(0);
  });

  test('blank-subject threads still get a non-empty topic label', ({ expect }) => {
    const blank = buildThreads([msg('', 'a@x.com', '2001-05-01T10:00:00.000Z')], { ownerEmail: OWNER, now: NOW });
    const [draft] = clusterThreads(blank);
    expect(draft.label).toBe('no-subject');
  });

  test('summarizeTopics replaces summaries via the summarizer and degrades on failure', async ({ expect }) => {
    const drafts = clusterThreads(threads());
    const summarized = await summarizeTopics(drafts, async () => 'LLM topic summary.');
    for (const draft of summarized) {
      expect(draft.summary).toBe('LLM topic summary.');
    }

    // A failing summarizer keeps the deterministic summary.
    const degraded = await summarizeTopics(drafts, async () => {
      throw new Error('model down');
    });
    expect(degraded.map((draft) => draft.summary)).toEqual(drafts.map((draft) => draft.summary));
  });

  test('materializeTopics produces Topic ECHO objects', ({ expect }) => {
    const [first] = materializeTopics(clusterThreads(threads()));
    expect(Obj.instanceOf(Topic, first)).toBe(true);
    expect(first.threadIds.length).toBeGreaterThan(0);
  });
});

const msg = (subject: string, from: string, created: string, summary?: string) =>
  Message.make({
    created,
    sender: { email: from },
    blocks: [{ _tag: 'text', text: 'body' }],
    properties: { subject, messageId: `<${from}:${created}>`, ...(summary ? { summary } : {}) },
  });

// Two related threads (shared participants + overlapping subject tokens) and one unrelated thread.
const threads = () =>
  buildThreads(
    [
      msg('Q2 report draft', 'alice@enron.com', '2001-05-01T10:00:00.000Z', 'Draft circulated.'),
      msg('RE: Q2 report draft', OWNER, '2001-05-01T11:00:00.000Z', 'Comments sent.'),
      msg('Q2 report budget numbers', 'alice@enron.com', '2001-05-01T12:00:00.000Z', 'Budget attached.'),
      msg('Lunch on friday?', 'zed@other.org', '2001-05-01T13:00:00.000Z'),
    ],
    { ownerEmail: OWNER, now: NOW },
  );
