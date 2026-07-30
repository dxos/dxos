//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Ref } from '@dxos/echo';
import { Message } from '@dxos/types';

import * as Reaction from './Reaction';
import * as Thread from './Thread';
import {
  findOwnReaction,
  foldReactions,
  foldThreads,
  selectRoots,
  selectThread,
  selectThreadByTarget,
  senderKey,
} from './threads';

const DID_ALICE = 'did:key:alice';
const DID_BOB = 'did:key:bob';

const makeMessage = ({
  did = DID_ALICE,
  text = '',
  created = '2026-01-01T00:00:00.000Z',
  threadId,
}: { did?: string; text?: string; created?: string; threadId?: string } = {}) =>
  Message.make({
    created,
    sender: { identityDid: did },
    blocks: [{ _tag: 'text', text }],
    ...(threadId ? { threadId } : {}),
  });

const makeReaction = (target: Message.Message, emoji: string, did: string) =>
  Reaction.make({ target: Ref.make(target), emoji, sender: { identityDid: did } });

/** The thread rooted at `message`, as the create-thread operation appends it. */
const createThread = (message: Message.Message, name?: string) =>
  Thread.make({ target: Ref.make(message), ...(name ? { name } : {}) });

describe('threads', () => {
  describe('selectRoots', () => {
    test('keeps only messages with no threadId', ({ expect }) => {
      const root = makeMessage({ text: 'root' });
      const reply = makeMessage({ text: 'reply', threadId: root.id });
      expect(selectRoots([root, reply]).map((message) => message.id)).to.deep.eq([root.id]);
    });

    test('an empty channel has no roots', ({ expect }) => {
      expect(selectRoots([])).to.deep.eq([]);
    });
  });

  describe('selectThread', () => {
    test('returns the thread ascending by created', ({ expect }) => {
      const root = makeMessage({ text: 'root' });
      const late = makeMessage({ text: 'late', created: '2026-01-01T00:02:00.000Z', threadId: root.id });
      const early = makeMessage({ text: 'early', created: '2026-01-01T00:01:00.000Z', threadId: root.id });
      const other = makeMessage({ text: 'other', threadId: 'elsewhere' });
      expect(selectThread([root, late, early, other], root.id).map((message) => message.id)).to.deep.eq([
        early.id,
        late.id,
      ]);
    });
  });

  describe('foldThreads', () => {
    test('a message no thread was created from is not a thread, however many sit beside it', ({ expect }) => {
      const root = makeMessage({ text: 'root' });
      const other = makeMessage({ text: 'other' });
      expect(foldThreads([root, other]).size).to.eq(0);
    });

    // Creating a thread is the deliberate act; it exists from that moment, before anyone replies.
    test('a created thread has its root and no replies', ({ expect }) => {
      const root = makeMessage({ text: 'root' });
      const thread = createThread(root);
      const summary = foldThreads([root], [thread]).get(thread.id);
      expect(summary?.root?.id).to.eq(root.id);
      expect(summary?.replies).to.have.length(0);
      expect(summary?.lastActivity).to.eq(root.created);
    });

    // A thread's id is its own, not its root's: replies partition on the thread.
    test('replies carry the thread id, and the message resolves to its thread', ({ expect }) => {
      const root = makeMessage({ text: 'root' });
      const thread = createThread(root);
      const reply = makeMessage({ text: 'a', threadId: thread.id });
      const summaries = foldThreads([root, reply], [thread]);
      expect(summaries.get(thread.id)?.replies).to.have.length(1);
      expect(selectThreadByTarget(summaries, root.id)?.threadId).to.eq(thread.id);
    });

    // Threads seeded or imported without a thread object (the onboarding exemplar) stay addressable,
    // keyed by the root message their replies name.
    test('replies alone still fold as a thread', ({ expect }) => {
      const root = makeMessage({ text: 'root' });
      const reply = makeMessage({ text: 'a', threadId: root.id });
      expect(foldThreads([root, reply]).get(root.id)?.replies).to.have.length(1);
    });

    test('folds replies, participants and last activity', ({ expect }) => {
      const root = makeMessage({ text: 'root' });
      const first = makeMessage({ text: 'a', created: '2026-01-01T00:01:00.000Z', threadId: root.id });
      const second = makeMessage({
        did: DID_BOB,
        text: 'b',
        created: '2026-01-01T00:02:00.000Z',
        threadId: root.id,
      });

      const summary = foldThreads([root, second, first]).get(root.id);
      expect(summary?.root?.id).to.eq(root.id);
      expect(summary?.replies.map((message) => message.id)).to.deep.eq([first.id, second.id]);
      expect(summary?.participants).to.deep.eq([DID_ALICE, DID_BOB]);
      expect(summary?.lastActivity).to.eq('2026-01-01T00:02:00.000Z');
    });

    test('a participant who replies twice is listed once', ({ expect }) => {
      const root = makeMessage({ text: 'root' });
      const replies = [
        makeMessage({ text: 'a', created: '2026-01-01T00:01:00.000Z', threadId: root.id }),
        makeMessage({ text: 'b', created: '2026-01-01T00:02:00.000Z', threadId: root.id }),
      ];
      expect(foldThreads([root, ...replies]).get(root.id)?.participants).to.deep.eq([DID_ALICE]);
    });

    test('takes the name from the thread', ({ expect }) => {
      const root = makeMessage({ text: 'root' });
      const thread = createThread(root, 'Q2 planning');
      expect(foldThreads([root], [thread]).get(thread.id)?.name).to.eq('Q2 planning');
    });

    // One thread per message: duplicates only arise across a network partition, and every peer has to
    // elect the same one — feed order, which is the order the fold reads them in.
    test('duplicate threads on one message fold to the first in feed order', ({ expect }) => {
      const root = makeMessage({ text: 'root' });
      const first = createThread(root, 'First');
      const second = createThread(root, 'Second');
      const summaries = foldThreads([root], [first, second]);
      expect(summaries.size).to.eq(1);
      expect(summaries.get(first.id)?.name).to.eq('First');
    });

    // A partition with no thread object folds by its replies, so the summary carries no name.
    test('a thread known only by its replies has no name', ({ expect }) => {
      const root = makeMessage({ text: 'root' });
      const reply = makeMessage({ text: 'a', threadId: root.id });
      expect(foldThreads([root, reply]).get(root.id)?.name).to.be.undefined;
    });

    // A thread outlives the message it branched from: deleting the root must not strand its replies.
    test('a thread whose root is absent still folds', ({ expect }) => {
      const reply = makeMessage({ text: 'orphan', threadId: 'missing-root' });
      const summary = foldThreads([reply]).get('missing-root');
      expect(summary?.root).to.be.undefined;
      expect(summary?.replies).to.have.length(1);
      expect(summary?.lastActivity).to.eq(reply.created);
    });
  });

  describe('foldReactions', () => {
    test('counts distinct senders per emoji and flags the local one', ({ expect }) => {
      const message = makeMessage({ text: 'hello' });
      const folded = foldReactions(
        [makeReaction(message, '👍', DID_ALICE), makeReaction(message, '👍', DID_BOB)],
        DID_ALICE,
      );

      const summaries = folded.get(message.id);
      expect(summaries).to.deep.eq([{ emoji: '👍', count: 2, self: true }]);
    });

    test('self is false when the local identity has not reacted', ({ expect }) => {
      const message = makeMessage({ text: 'hello' });
      const folded = foldReactions([makeReaction(message, '🎉', DID_BOB)], DID_ALICE);
      expect(folded.get(message.id)).to.deep.eq([{ emoji: '🎉', count: 1, self: false }]);
    });

    // An offline retry can append the same author's reaction twice; the fold must stay idempotent.
    test('a duplicate reaction from one sender does not inflate the count', ({ expect }) => {
      const message = makeMessage({ text: 'hello' });
      const folded = foldReactions(
        [makeReaction(message, '👍', DID_ALICE), makeReaction(message, '👍', DID_ALICE)],
        DID_ALICE,
      );
      expect(folded.get(message.id)?.[0].count).to.eq(1);
    });

    test('separates emoji and targets', ({ expect }) => {
      const first = makeMessage({ text: 'one' });
      const second = makeMessage({ text: 'two' });
      const folded = foldReactions(
        [makeReaction(first, '👍', DID_ALICE), makeReaction(first, '🎉', DID_BOB), makeReaction(second, '👍', DID_BOB)],
        DID_ALICE,
      );

      expect(folded.get(first.id)).to.have.length(2);
      expect(folded.get(second.id)).to.deep.eq([{ emoji: '👍', count: 1, self: false }]);
    });
  });

  describe('findOwnReaction', () => {
    test('finds the local identity reaction and ignores others', ({ expect }) => {
      const message = makeMessage({ text: 'hello' });
      const mine = makeReaction(message, '👍', DID_ALICE);
      const reactions = [makeReaction(message, '👍', DID_BOB), mine, makeReaction(message, '🎉', DID_ALICE)];

      expect(findOwnReaction(reactions, { messageId: message.id, emoji: '👍', identityDid: DID_ALICE })?.id).to.eq(
        mine.id,
      );
      expect(findOwnReaction(reactions, { messageId: message.id, emoji: '🚀', identityDid: DID_ALICE })).to.be
        .undefined;
    });

    test('does not match a reaction on another message', ({ expect }) => {
      const first = makeMessage({ text: 'one' });
      const second = makeMessage({ text: 'two' });
      const reactions = [makeReaction(second, '👍', DID_ALICE)];
      expect(findOwnReaction(reactions, { messageId: first.id, emoji: '👍', identityDid: DID_ALICE })).to.be.undefined;
    });
  });

  describe('senderKey', () => {
    test('prefers the did, then falls back for bridged senders', ({ expect }) => {
      expect(senderKey({ identityDid: DID_ALICE, name: 'Alice' })).to.eq(DID_ALICE);
      expect(senderKey({ email: 'a@example.com', name: 'Alice' })).to.eq('a@example.com');
      expect(senderKey({ name: 'Alice' })).to.eq('Alice');
      expect(senderKey({})).to.eq('anonymous');
    });
  });
});
