//
// Copyright 2026 DXOS.org
//

import { type Type } from '@dxos/semantic-index';

const extractor = { id: 'default', model: 'ai.claude.model.claude-haiku-4-5', version: '1' };

/**
 * Static demo facts that exercise the viewer: an entity→entity conflict (f1 vs f2,
 * same subject + predicate, different objects/sources) plus a coherent pair (f3/f4).
 */
export const DEMO_FACTS: Type.Fact[] = [
  {
    id: 'f1',
    assertion: {
      subject: { entity: 'alice' },
      predicate: 'travelsTo',
      object: { entity: 'paris' },
      validFrom: '2026-06-12',
      quote: "I think I'm probably going to Paris next week",
    },
    valence: { factuality: 'PR+', polarity: '+', confidence: 0.6, nature: 'epistemic' },
    attribution: { agent: 'alice', source: 'dxn:gmail:msg-1', generatedAtTime: '2026-06-06T09:00:00.000Z' },
    recordedAt: '2026-06-06T09:00:00.000Z',
    extractor,
    sourceHash: 'demo',
  },
  {
    id: 'f2',
    assertion: {
      subject: { entity: 'alice' },
      predicate: 'travelsTo',
      object: { entity: 'rome' },
      quote: "Alice told me she's definitely going to Rome, not Paris.",
    },
    valence: { factuality: 'CT+', polarity: '+', confidence: 0.95 },
    attribution: { agent: 'bob', source: 'dxn:gmail:msg-2', generatedAtTime: '2026-06-07T10:00:00.000Z' },
    recordedAt: '2026-06-07T10:00:00.000Z',
    extractor,
    sourceHash: 'demo',
  },
  {
    id: 'f3',
    assertion: {
      subject: { entity: 'q3-board-meeting' },
      predicate: 'scheduledFor',
      object: { literal: '2026-07-15' },
      quote: 'The Q3 board meeting is confirmed for July 15 in London.',
    },
    valence: { factuality: 'CT+', polarity: '+' },
    attribution: { agent: 'carol', source: 'dxn:gmail:msg-3', generatedAtTime: '2026-06-08T11:00:00.000Z' },
    recordedAt: '2026-06-08T11:00:00.000Z',
    extractor,
    sourceHash: 'demo',
  },
  {
    id: 'f4',
    assertion: {
      subject: { entity: 'q3-board-meeting' },
      predicate: 'locatedIn',
      object: { entity: 'london' },
    },
    valence: { factuality: 'CT+', polarity: '+' },
    attribution: { agent: 'carol', source: 'dxn:gmail:msg-3', generatedAtTime: '2026-06-08T11:00:00.000Z' },
    recordedAt: '2026-06-08T11:00:00.000Z',
    extractor,
    sourceHash: 'demo',
  },
] satisfies Type.Fact[];
