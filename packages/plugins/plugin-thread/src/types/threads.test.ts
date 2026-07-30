//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Ref } from '@dxos/echo';
import { Message, Reaction, ThreadRoot } from '@dxos/types';

import {
  findOwnDeclaration,
  findOwnReaction,
  foldReactions,
  foldThreads,
  selectRoots,
  selectThread,
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

const makeDeclaration = (
  target: Message.Message,
  {
    did = DID_ALICE,
    name,
    created = '2026-01-01T00:00:00.000Z',
  }: { did?: string; name?: string; created?: string } = {},
) => ThreadRoot.make({ target: Ref.make(target), creator: { identityDid: did }, created, ...(name ? { name } : {}) });

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
    test('an undeclared root is not a thread, however many messages sit beside it', ({ expect }) => {
      const root = makeMessage({ text: 'root' });
      const other = makeMessage({ text: 'other' });
      expect(foldThreads([root, other]).size).to.eq(0);
    });

    // Creating a thread is the deliberate act; it exists from that moment, before anyone replies.
    test('a declared root is a thread with no replies', ({ expect }) => {
      const root = makeMessage({ text: 'root' });
      const summary = foldThreads([root], [makeDeclaration(root)]).get(root.id);
      expect(summary?.root?.id).to.eq(root.id);
      expect(summary?.replies).to.have.length(0);
      expect(summary?.lastActivity).to.eq(root.created);
    });

    // Threads seeded or imported without declarations (the onboarding exemplar) stay addressable.
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

    test('takes the name from the declaration', ({ expect }) => {
      const root = makeMessage({ text: 'root' });
      const declaration = makeDeclaration(root, { name: 'Q2 planning' });
      expect(foldThreads([root], [declaration]).get(root.id)?.name).to.eq('Q2 planning');
    });

    // Declarations are per author, so naming resolves across them by recency — which is what lets a
    // participant rename a thread without writing anyone else's feed item.
    test('the most recently written name wins', ({ expect }) => {
      const root = makeMessage({ text: 'root' });
      const declarations = [
        makeDeclaration(root, { name: 'First', created: '2026-01-01T00:00:00.000Z' }),
        makeDeclaration(root, { did: DID_BOB, name: 'Second', created: '2026-01-01T00:05:00.000Z' }),
      ];
      expect(foldThreads([root], declarations).get(root.id)?.name).to.eq('Second');
      expect(foldThreads([root], [...declarations].reverse()).get(root.id)?.name).to.eq('Second');
    });

    test('an unnamed declaration does not blank an existing name', ({ expect }) => {
      const root = makeMessage({ text: 'root' });
      const declarations = [
        makeDeclaration(root, { name: 'Q2 planning', created: '2026-01-01T00:00:00.000Z' }),
        makeDeclaration(root, { did: DID_BOB, created: '2026-01-01T00:05:00.000Z' }),
      ];
      expect(foldThreads([root], declarations).get(root.id)?.name).to.eq('Q2 planning');
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

  describe('findOwnDeclaration', () => {
    test('finds the local identity declaration and ignores others', ({ expect }) => {
      const root = makeMessage({ text: 'root' });
      const other = makeMessage({ text: 'other' });
      const declarations = [
        makeDeclaration(root, { did: DID_BOB }),
        makeDeclaration(root, { did: DID_ALICE }),
        makeDeclaration(other, { did: DID_ALICE }),
      ];
      const own = findOwnDeclaration(declarations, { threadId: root.id, identityDid: DID_ALICE });
      expect(own).to.eq(declarations[1]);
      expect(findOwnDeclaration(declarations, { threadId: root.id, identityDid: 'did:key:carol' })).to.be.undefined;
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
