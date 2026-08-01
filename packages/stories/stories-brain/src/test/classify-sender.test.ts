//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message } from '@dxos/types';

import { type SenderClass, classifySenderHeuristic, scoreSenders, uniqueSenders } from '../testing/harness';

// Deterministic coverage for the sender-triage heuristic + scorer — no fixture / model required, so it
// runs in CI (the model-graded eval lives in classify-sender.bench.test.ts and skips without the
// private corpus).

describe('classifySenderHeuristic', () => {
  test('flags automated / role mailboxes as org', ({ expect }) => {
    for (const email of [
      'no-reply@example.com',
      'noreply@stripe.com',
      'notifications@github.com',
      'support@acme.io',
      'billing@vendor.com',
      'bounces+abc123@mailer.net',
      'careers@bigco.com',
    ]) {
      const result = classifySenderHeuristic(sender(email));
      expect(result.class, email).toBe('org');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    }
  });

  test('flags company display names as org', ({ expect }) => {
    const result = classifySenderHeuristic(sender('hi@acme.com', 'Acme Inc'));
    expect(result.class).toBe('org');
  });

  test('classifies human-shaped senders as person', ({ expect }) => {
    for (const [email, name] of [
      ['jane.doe@gmail.com', 'Jane Doe'],
      ['rich@braneframe.com', 'Rich Burdon'],
      ['jdoe@company.com', undefined],
    ] as const) {
      const result = classifySenderHeuristic(sender(email, name));
      expect(result.class, email).toBe('person');
    }
  });

  test('a person name overrides a corporate domain', ({ expect }) => {
    const result = classifySenderHeuristic(sender('r.b@braneframe.com', 'Rich Burdon'));
    expect(result.class).toBe('person');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('opaque / numeric local parts fall back to org', ({ expect }) => {
    const result = classifySenderHeuristic(sender('u8837261@marketing.example.com'));
    expect(result.class).toBe('org');
  });
});

describe('uniqueSenders', () => {
  test('dedups by email, counts, and keeps the freshest name + subjects', ({ expect }) => {
    const make = (email: string, name: string, subject: string, created: string) =>
      Message.make({ created, sender: { email, name }, blocks: [{ _tag: 'text', text: '' }], properties: { subject } });
    // Oldest-first, mirroring loadFixtureMessages.
    const messages = [
      make('a@x.com', 'Old Name', 'First', '2026-01-01T00:00:00.000Z'),
      make('a@x.com', 'New Name', 'Second', '2026-01-02T00:00:00.000Z'),
      make('b@y.com', 'B', 'Only', '2026-01-03T00:00:00.000Z'),
    ];
    const senders = uniqueSenders(messages);
    expect(senders).toHaveLength(2);
    const first = senders.find((entry) => entry.email === 'a@x.com');
    expect(first?.count).toBe(2);
    expect(first?.name).toBe('New Name'); // Freshest wins.
    expect(first?.subjects[0]).toBe('Second'); // Newest subject first.
  });
});

describe('scoreSenders', () => {
  const gold = new Map<string, SenderClass>([
    ['p1@x.com', 'person'],
    ['p2@x.com', 'person'],
    ['o1@x.com', 'org'],
    ['o2@x.com', 'org'],
  ]);

  test('perfect predictions score 1', ({ expect }) => {
    const predictions = [...gold.entries()].map(([email, klass]) => ({
      email,
      class: klass,
      confidence: 1,
      method: 'heuristic' as const,
    }));
    const score = scoreSenders(predictions, gold);
    expect(score.scored).toBe(4);
    expect(score.accuracy).toBe(1);
    expect(score.macroF1).toBe(1);
  });

  test('confusion is directional and unlabelled senders are ignored', ({ expect }) => {
    const predictions = [
      { email: 'p1@x.com', class: 'person' as const, confidence: 1, method: 'heuristic' as const },
      { email: 'p2@x.com', class: 'org' as const, confidence: 1, method: 'heuristic' as const }, // person→org
      { email: 'o1@x.com', class: 'org' as const, confidence: 1, method: 'heuristic' as const },
      { email: 'o2@x.com', class: 'person' as const, confidence: 1, method: 'heuristic' as const }, // org→person
      { email: 'unlabelled@x.com', class: 'person' as const, confidence: 1, method: 'heuristic' as const },
    ];
    const score = scoreSenders(predictions, gold);
    expect(score.scored).toBe(4);
    expect(score.accuracy).toBe(0.5);
    expect(score.confusion.personAsOrg).toBe(1);
    expect(score.confusion.orgAsPerson).toBe(1);
    expect(score.confusion.personAsPerson).toBe(1);
    expect(score.confusion.orgAsOrg).toBe(1);
  });
});

const sender = (email: string, name?: string, subjects: string[] = []) => ({
  email,
  name,
  count: 1,
  subjects,
});
