//
// Copyright 2026 DXOS.org
//

// Eval for the topic detector: a hand-labeled channel with four participants and three
// interleaved conversations (questions, @mention answers, replies, comments, and a lunch tangent
// after a session gap). The detector must recover exactly the labeled segments.

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { expect } from 'vitest';

import { type StoredMessage } from '../stores';
import { detectTopics, salientTokens } from './detect-topics';

const at = (minutesPastTen: number): string =>
  new Date(Date.UTC(2026, 5, 1, 10, 0, 0) + minutesPastTen * 60_000).toISOString();

const message = (
  id: string,
  authorId: string,
  authorLabel: string,
  text: string,
  minutesPastTen: number,
  parentId?: string,
): StoredMessage => ({
  id,
  targetId: 'chan-1',
  authorId,
  authorLabel,
  text,
  createdAt: at(minutesPastTen),
  ...(parentId ? { parentId } : {}),
  raw: '{}',
});

/**
 * Timeline (minutes past 10:00 UTC):
 *   Topic A (storage): m1 Alice asks about OPFS → m3 Carol answers @Alice → m5 Alice follow-up →
 *     m7 Dave joins via @Carol.
 *   Topic B (release), interleaved with A: m2 Bob asks → m4 Dave answers @Bob → m6 Bob replies (m4).
 *   Topic C (lunch), after a 54-minute session gap: m8 Carol starts it (despite being a Topic A
 *     participant) → m9 Alice joins via @Carol.
 */
const CHANNEL: StoredMessage[] = [
  message('9000', 'a1', 'Alice', 'Should Composer use OPFS for local persistent storage?', 0),
  message('9001', 'b1', 'Bob', 'When is the next release of Composer planned?', 1),
  message('9002', 'c1', 'Carol', '@Alice OPFS gives durable browser storage.', 2),
  message('9003', 'd1', 'Dave', '@Bob release is planned for Friday.', 3),
  message('9004', 'a1', 'Alice', 'Does OPFS work in private browsing?', 4),
  message('9005', 'b1', 'Bob', 'great, thanks!', 5, '9003'),
  message('9006', 'd1', 'Dave', '@Carol what about quota limits for OPFS?', 6),
  message('9007', 'c1', 'Carol', 'Anyone up for lunch at the taqueria?', 60),
  message('9008', 'a1', 'Alice', '@Carol yes, count me in.', 62),
];

describe('salientTokens', () => {
  it.effect(
    'keeps topical vocabulary and drops chat filler',
    Effect.fnUntraced(function* () {
      const tokens = salientTokens('Should Composer use OPFS for local persistent storage?');
      expect(tokens.has('composer')).toBe(true);
      expect(tokens.has('opfs')).toBe(true);
      expect(tokens.has('storage')).toBe(true);
      expect(tokens.has('should')).toBe(false);
      expect(tokens.has('for')).toBe(false);
    }),
  );
});

describe('detectTopics (eval)', () => {
  it.effect(
    'recovers three interleaved topics with correct participants and boundaries',
    Effect.fnUntraced(function* () {
      const segments = detectTopics({ id: 'chan-1' }, CHANNEL);
      expect(segments.length).toBe(3);

      const [storage, release, lunch] = segments;

      // Topic A: Alice asks, Carol answers, Dave joins late by mentioning Carol.
      expect(storage.startMessageId).toBe('9000');
      expect(storage.endMessageId).toBe('9006');
      expect(storage.messageIds).toEqual(['9000', '9002', '9004', '9006']);
      expect(storage.participants).toEqual(['a1', 'c1', 'd1']);
      expect(storage.participantLabels).toEqual(['Alice', 'Carol', 'Dave']);

      // Topic B: interleaved with A; Bob's closing "great, thanks!" attaches by reply link only.
      expect(release.startMessageId).toBe('9001');
      expect(release.endMessageId).toBe('9005');
      expect(release.messageIds).toEqual(['9001', '9003', '9005']);
      expect(release.participants).toEqual(['b1', 'd1']);

      // Topic C: opened after the session gap — Carol starts a NEW topic even though she already
      // participates in Topic A; Alice joins it via @mention.
      expect(lunch.startMessageId).toBe('9007');
      expect(lunch.endMessageId).toBe('9008');
      expect(lunch.messageIds).toEqual(['9007', '9008']);
      expect(lunch.participants).toEqual(['c1', 'a1']);
      expect(lunch.startedAt).toBe(at(60));
      expect(lunch.endedAt).toBe(at(62));
    }),
  );

  it.effect(
    'a subthread is a single topic spanning the whole conversation (even across time gaps)',
    Effect.fnUntraced(function* () {
      const thread: StoredMessage[] = [
        { ...message('9100', 'a1', 'Alice', 'Kicking off the design review.', 0), targetId: 'thread-9' },
        { ...message('9101', 'b1', 'Bob', 'Left comments inline.', 5), targetId: 'thread-9' },
        // A long pause does not split a subthread conversation.
        { ...message('9102', 'a1', 'Alice', 'Addressed everything, merging tomorrow.', 300), targetId: 'thread-9' },
      ];
      const segments = detectTopics({ id: 'thread-9', threadId: 'thread-9' }, thread);
      expect(segments.length).toBe(1);
      expect(segments[0].threadId).toBe('thread-9');
      expect(segments[0].participants).toEqual(['a1', 'b1']);
      expect(segments[0].startMessageId).toBe('9100');
      expect(segments[0].endMessageId).toBe('9102');
    }),
  );

  it.effect(
    'handles empty targets and keyword-only continuity',
    Effect.fnUntraced(function* () {
      expect(detectTopics({ id: 'chan-1' }, [])).toEqual([]);

      // No mentions or replies: pure subject continuity (shared vocabulary) keeps a topic together
      // only when overlap clears the threshold.
      const drift: StoredMessage[] = [
        message('9200', 'a1', 'Alice', 'The automerge compaction job keeps failing.', 0),
        message('9201', 'b1', 'Bob', 'Compaction failing here too, automerge version mismatch?', 2),
        message('9202', 'c1', 'Carol', 'Selling my old keyboard, anyone interested?', 4),
      ];
      const segments = detectTopics({ id: 'chan-1' }, drift);
      expect(segments.length).toBe(2);
      expect(segments[0].messageIds).toEqual(['9200', '9201']);
      expect(segments[1].messageIds).toEqual(['9202']);
    }),
  );
});
