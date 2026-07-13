//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type TopicDraft } from '@dxos/pipeline-email';
import { Message } from '@dxos/types';

import {
  type ActiveTopicsDeps,
  type ScoredCandidate,
  activityScore,
  assembleActiveTopic,
  classifyTopics,
  combineConfidence,
  populatedChecklist,
  renderTasksMarkdown,
  runActiveTopics,
  topicSlug,
  toSuggestedTopic,
} from '../testing/harness/internal/active-topics';
import { renderIndex, renderTopicReport } from '../testing/harness/internal/active-topics-report';

const NOW = new Date('2026-01-15T00:00:00.000Z').getTime();
const DAY = 24 * 60 * 60 * 1000;

const draft = (overrides: Partial<TopicDraft> = {}): TopicDraft => ({
  label: 'q2 report',
  summary: 'summary',
  threadIds: ['t1'],
  participants: ['alice@example.com'],
  keywords: ['q2'],
  questions: [],
  tasks: [],
  ...overrides,
});

describe('activityScore', () => {
  test('a recent, awaiting-mine, person-linked topic with open items scores high', ({ expect }) => {
    const score = activityScore(
      { latestCreatedMs: NOW, awaitingMine: true, personLinked: true, openItemCount: 5 },
      { nowMs: NOW },
    );
    expect(score).toBeCloseTo(1, 5);
  });

  test('a stale, org, no-action topic scores low', ({ expect }) => {
    const score = activityScore(
      { latestCreatedMs: NOW - 120 * DAY, awaitingMine: false, personLinked: false, openItemCount: 0 },
      { nowMs: NOW },
    );
    expect(score).toBeLessThan(0.05);
  });

  test('recency decays to ~half a weight at one half-life', ({ expect }) => {
    const recent = activityScore(
      { latestCreatedMs: NOW, awaitingMine: false, personLinked: false, openItemCount: 0 },
      { nowMs: NOW, halfLifeMs: 14 * DAY },
    );
    const oneHalfLife = activityScore(
      { latestCreatedMs: NOW - 14 * DAY, awaitingMine: false, personLinked: false, openItemCount: 0 },
      { nowMs: NOW, halfLifeMs: 14 * DAY },
    );
    expect(oneHalfLife).toBeCloseTo(recent / 2, 5);
  });
});

describe('combineConfidence', () => {
  test('weights the LLM score by w and clamps to [0,1]', ({ expect }) => {
    expect(combineConfidence(0.4, 0.9, 0.6)).toBeCloseTo(0.6 * 0.9 + 0.4 * 0.4, 5);
    expect(combineConfidence(2, 2, 0.6)).toBe(1);
    expect(combineConfidence(-1, -1, 0.6)).toBe(0);
  });
});

describe('classifyTopics', () => {
  const scored = (label: string, confidence: number): ScoredCandidate => ({
    draft: draft({ label }),
    confidence,
    rationale: '',
  });

  test('active = confidence ≥ threshold, capped at top, highest first', ({ expect }) => {
    const { active, suggested } = classifyTopics(
      [scored('a', 0.9), scored('b', 0.55), scored('c', 0.8), scored('d', 0.7)],
      { threshold: 0.6, top: 2 },
    );
    expect(active.map((entry) => entry.draft.label)).toEqual(['a', 'c']); // top 2 above threshold
    expect(suggested.map((entry) => entry.draft.label)).toEqual(['d', 'b']); // d above threshold but over cap
  });
});

describe('renderTasksMarkdown', () => {
  test('emits a checkbox list', ({ expect }) => {
    expect(renderTasksMarkdown(['Review draft', ' Send budget '])).toBe('- [ ] Review draft\n- [ ] Send budget');
  });
});

describe('assembleActiveTopic + checklist', () => {
  const candidate: ScoredCandidate = { draft: draft(), confidence: 0.82, rationale: 'awaiting reply' };

  test('assembles fields and builds the tasks Outline', ({ expect }) => {
    const topic = assembleActiveTopic(candidate, {
      status: 'Awaiting Alice.',
      facts: ['alice owns q2 report'],
      tasks: ['Review draft'],
      drafts: [{ threadId: 't1', draft: 'Thanks!' }],
    });
    expect(topic.kind).toBe('active');
    expect(topic.confidence).toBe(0.82);
    expect(topic.tasks.name).toBe('q2 report — tasks');
    expect(topic.tasks.content.target?.content).toBe('- [ ] Review draft');
    expect(populatedChecklist(topic)).toEqual({ status: true, facts: true, tasks: true, drafts: true });
  });

  test('checklist flags empty populated fields', ({ expect }) => {
    const topic = assembleActiveTopic(candidate, { status: '', facts: [], tasks: [], drafts: [] });
    expect(populatedChecklist(topic)).toEqual({ status: false, facts: false, tasks: false, drafts: false });
  });
});

describe('toSuggestedTopic + topicSlug', () => {
  test('suggested topic carries counts + confidence, not populated fields', ({ expect }) => {
    const suggestion = toSuggestedTopic({
      draft: draft({ threadIds: ['t1', 't2'], participants: ['a@x.com', 'b@x.com'] }),
      confidence: 0.3,
      rationale: 'low activity',
    });
    expect(suggestion).toMatchObject({ kind: 'suggested', threadCount: 2, participantCount: 2, confidence: 0.3 });
  });

  test('slugifies labels', ({ expect }) => {
    expect(topicSlug('Q2 Report & Budget!')).toBe('q2-report-budget');
    expect(topicSlug('///')).toBe('topic');
  });
});

describe('runActiveTopics', () => {
  const OWNER = 'me@x.com';
  const NOW_MS = new Date('2026-01-10T12:00:00.000Z').getTime();
  const msg = (subject: string, from: string, created: string) =>
    Message.make({
      created,
      sender: { email: from },
      blocks: [{ _tag: 'text', text: 'body' }],
      properties: { subject, messageId: `<${from}:${created}>` },
    });

  // A recent person thread (last from Alice → awaiting-mine) and a recent org thread.
  const messages = () => [
    msg('Project alpha', 'alice@x.com', '2026-01-09T10:00:00.000Z'),
    msg('RE: Project alpha', 'alice@x.com', '2026-01-10T09:00:00.000Z'),
    msg('Newsletter digest', 'news@corp.com', '2026-01-10T08:00:00.000Z'),
  ];

  const stubDeps = (): ActiveTopicsDeps => ({
    // High confidence for the person topic, low for the org one (keyed off the label).
    confidence: async (context) =>
      context.draft.label.includes('project')
        ? { confidence: 0.9, rationale: 'awaiting your reply' }
        : { confidence: 0.2, rationale: 'bulk digest' },
    status: async () => 'Awaiting your reply.',
    facts: async () => ['alice owns project alpha'],
    tasks: async () => ['Reply to Alice'],
    draft: async (context) => context.threads.map((thread) => ({ threadId: thread.threadId, draft: 'On it.' })),
  });

  test('splits active (populated) from suggested and fills the active fields', async ({ expect }) => {
    const result = await runActiveTopics(
      { messages: messages(), nowMs: NOW_MS, ownerEmail: OWNER, personEmails: new Set(['alice@x.com']) },
      stubDeps(),
    );
    expect(result.active).toHaveLength(1);
    const [topic] = result.active;
    expect(topic.label).toContain('project');
    expect(populatedChecklist(topic)).toEqual({ status: true, facts: true, tasks: true, drafts: true });
    expect(topic.tasks.content.target?.content).toBe('- [ ] Reply to Alice');
    expect(result.suggested.some((entry) => entry.label.includes('newsletter'))).toBe(true);
  });
});

describe('report renderers', () => {
  const candidate: ScoredCandidate = { draft: draft(), confidence: 0.82, rationale: 'awaiting reply' };
  const topic = assembleActiveTopic(candidate, {
    status: 'Awaiting Alice on the budget.',
    facts: ['alice owns q2 report'],
    tasks: ['Review draft', 'Send budget'],
    drafts: [{ threadId: 'q2 report', draft: 'Thanks — will review by Friday.' }],
  });

  test('index lists active (with checklist + link) and suggested rows', ({ expect }) => {
    const index = renderIndex({
      active: [topic],
      suggested: [toSuggestedTopic({ draft: draft({ label: 'newsletter' }), confidence: 0.2, rationale: 'stale' })],
    });
    expect(index).toContain('## Active (1)');
    expect(index).toContain('[q2 report](q2-report.md)');
    expect(index).toContain('82%');
    expect(index).toContain('## Suggested (1)');
    expect(index).toContain('newsletter');
  });

  test('topic report includes status, task outline, facts, and drafts', ({ expect }) => {
    const report = renderTopicReport(topic);
    expect(report).toContain('# q2 report');
    expect(report).toContain('Awaiting Alice on the budget.');
    expect(report).toContain('- [ ] Review draft');
    expect(report).toContain('- [ ] Send budget');
    expect(report).toContain('- alice owns q2 report');
    expect(report).toContain('Thanks — will review by Friday.');
  });
});
