//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { SAMPLE_MESSAGES, type SampleMessage } from './sample-messages';

const TOPICS: SampleMessage['topic'][] = ['project', 'finance', 'scheduling', 'hiring', 'ops'];

/** Counts how many messages contain `term` (case-insensitive) in either the subject or body. */
const countHits = (term: string) => {
  const needle = term.toLowerCase();
  return SAMPLE_MESSAGES.filter(
    (message) => message.subject.toLowerCase().includes(needle) || message.body.toLowerCase().includes(needle),
  ).length;
};

describe('SAMPLE_MESSAGES', () => {
  test('has roughly 18 entries', () => {
    expect(SAMPLE_MESSAGES.length).toBeGreaterThanOrEqual(16);
    expect(SAMPLE_MESSAGES.length).toBeLessThanOrEqual(20);
  });

  test('every entry has the required non-empty fields and a valid topic', () => {
    for (const message of SAMPLE_MESSAGES) {
      expect(message.from.email.length).toBeGreaterThan(0);
      expect(message.from.name.length).toBeGreaterThan(0);
      expect(message.subject.length).toBeGreaterThan(0);
      expect(message.body.length).toBeGreaterThan(0);
      expect(TOPICS).toContain(message.topic);
    }
  });

  test('all five topics are represented', () => {
    const seen = new Set(SAMPLE_MESSAGES.map((message) => message.topic));
    for (const topic of TOPICS) {
      expect(seen.has(topic)).toBe(true);
    }
  });

  test('key search terms appear in multiple messages', () => {
    expect(countHits('invoice')).toBeGreaterThanOrEqual(2);
    expect(countHits('payment')).toBeGreaterThanOrEqual(2);
    expect(countHits('deadline')).toBeGreaterThanOrEqual(2);
    expect(countHits('project')).toBeGreaterThanOrEqual(3);
    expect(countHits('meeting')).toBeGreaterThanOrEqual(2);
    expect(countHits('interview')).toBeGreaterThanOrEqual(2);
    expect(countHits('migration')).toBeGreaterThanOrEqual(2);
  });

  test('a few messages share a threadId for thread-grouping demos', () => {
    const threadIds = SAMPLE_MESSAGES.map((message) => message.threadId).filter(
      (id): id is string => typeof id === 'string',
    );
    const counts = new Map<string, number>();
    for (const id of threadIds) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const grouped = [...counts.values()].some((count) => count >= 2);
    expect(grouped).toBe(true);
  });
});
