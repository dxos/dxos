//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type TopicDraft } from '@dxos/pipeline-email';

import {
  type ScoredCandidate,
  activityScore,
  assembleActiveTopic,
  classifyTopics,
  combineConfidence,
  populatedChecklist,
  renderTasksMarkdown,
  topicSlug,
  toSuggestedTopic,
} from '../testing/harness/internal/active-topics';

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
