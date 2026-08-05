//
// Copyright 2024 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { random } from '@dxos/random';
import { type ValueGenerator, createGenerator } from '@dxos/schema/testing';
import { Message } from '@dxos/types';
import { hexToFallback } from '@dxos/util';

import { type MessageLike, type MessageMetadata, type MessageReaction, type MessageThreadSummary } from './types';

const generator: ValueGenerator = random as any;

const authors = [
  { did: 'did:key:alice', name: 'Alice' },
  { did: 'did:key:bob', name: 'Bob' },
];

/**
 * Generate sample `Message` objects (real `@dxos/types` schema) with text
 * blocks for stories, using the `@dxos/schema/testing` generator for base
 * fields and `@dxos/random` for content.
 */
export const createMessages = (count = 8): Message.Message[] => {
  const objectGenerator = createGenerator(generator, Message.Message);
  return (
    objectGenerator
      .createObjects(count)
      .map((message, index) => {
        const author = authors[index % authors.length];
        Obj.update(message, (message) => {
          message.sender = { role: 'user', identityDid: author.did, name: author.name };
          message.blocks = [{ _tag: 'text', text: random.lorem.paragraph() }];
        });
        return message;
      })
      // `Thread.Messages` documents ascending input, and the generator's dates are random: unsorted
      // messages make the day-divider ids repeat, which React reports as duplicate keys.
      .sort((left, right) => Date.parse(left.created) - Date.parse(right.created))
  );
};

/** Story metadata resolver mapping a message's sender to presentational fields. */
export const getStoryMetadata = (message: MessageLike): MessageMetadata => {
  const did = message.sender.identityDid ?? '0';
  const fallback = hexToFallback(did);
  return {
    id: Obj.getURI(message),
    timestamp: message.created,
    authorId: did,
    authorName: message.sender.name,
    authorAvatarProps: { hue: fallback.hue, emoji: fallback.emoji },
  };
};

//
// Story fixtures, shared by every stack that renders a thread of messages so the same conversation
// can be compared across them rather than each story file inventing its own.
//

export const STORY_IDENTITY = { role: 'user' as const, identityDid: 'did:key:alice', name: 'Alice' };

const alice = STORY_IDENTITY;
const bob = { role: 'user' as const, identityDid: 'did:key:bob', name: 'Bob' };
const carol = { role: 'user' as const, identityDid: 'did:key:carol', name: 'Carol' };

/**
 * One message from each sender shape: the local identity, a name-only sender with no `identityDid`
 * (an externally-synced guest), and a different identity.
 */
export const createMixedSenderMessages = (): Message.Message[] => [
  Message.make({
    sender: { role: 'user', identityDid: 'did:key:alice', name: 'Alice' },
    blocks: [{ _tag: 'text', text: 'Message from the local identity (Alice).' }],
  }),
  Message.make({
    sender: { name: 'guest' },
    blocks: [{ _tag: 'text', text: 'Message from a name-only sender (guest), no identityDid.' }],
  }),
  Message.make({
    sender: { role: 'user', identityDid: 'did:key:bob', name: 'Bob' },
    blocks: [{ _tag: 'text', text: 'Message from a different identity (Bob).' }],
  }),
];

/**
 * Grouping and both divider kinds: a same-sender burst inside the 60s window, a run past it, a
 * >3h same-day gap, a sender change, and the next calendar day.
 */
export const createGroupedMessages = (): Message.Message[] => {
  const day1 = new Date('2026-07-01T09:00:00.000Z').getTime();
  const day2 = new Date('2026-07-02T09:00:00.000Z').getTime();
  const at = (time: number, sender: typeof alice, text: string) =>
    Message.make({ created: new Date(time).toISOString(), sender, blocks: [{ _tag: 'text', text }] });

  return [
    at(day1, alice, 'First message in a burst.'),
    at(day1 + 10_000, alice, 'Second message, 10s later — same group.'),
    at(day1 + 40_000, alice, 'Third message, 40s after the first — still same group.'),
    at(day1 + 120_000, alice, 'New group: 2 minutes after the burst.'),
    at(day1 + 120_000 + 4 * 60 * 60 * 1000, alice, 'After a 4-hour silence — gap divider above.'),
    at(day1 + 120_000 + 4 * 60 * 60 * 1000 + 5_000, bob, 'Bob replies 5s later — different sender, new group.'),
    at(day2, bob, 'A new day.'),
  ];
};

export type ConversationFixture = {
  messages: Message.Message[];
  reactions: Map<string, MessageReaction[]>;
  threads: Map<string, MessageThreadSummary>;
};

/**
 * Every state a message can be rendered in, as one conversation: plain and grouped, reacted (one
 * emoji, several, one inside a group), quote-replying (alone and in a run), carrying a thread (a
 * single reply, a busy named one, one inside a group), and long-form.
 */
export const createConversationFixture = (): ConversationFixture => {
  const base = new Date('2026-07-30T09:00:00.000Z').getTime();
  let offset = 0;
  // Default gap starts a new group (over the 60s window); `10_000` continues the run above it.
  const at = (
    sender: typeof alice,
    text: string,
    { gap = 5 * 60_000, parentMessage }: { gap?: number; parentMessage?: Message.Message } = {},
  ) => {
    offset += gap;
    return Message.make({
      created: new Date(base + offset).toISOString(),
      sender,
      blocks: [{ _tag: 'text', text }],
      ...(parentMessage ? { parentMessage: Ref.make(parentMessage) } : {}),
    });
  };

  const reactions = new Map<string, MessageReaction[]>();
  const threads = new Map<string, MessageThreadSummary>();

  const single = at(bob, 'A single message from another sender.');
  const own = at(alice, 'A single message of my own — mine alone can be edited or deleted.');

  const groupHead = at(carol, 'A run of messages from one sender…');
  const groupMiddle = at(carol, '…grouped under a single avatar…', { gap: 10_000 });
  const groupTail = at(carol, '…each row still carrying its own controls.', { gap: 10_000 });

  const reactedOnce = at(bob, 'Reacted to once.');
  reactions.set(reactedOnce.id, [{ emoji: '👍', count: 1, self: false }]);

  const reactedOften = at(bob, 'Reacted to several ways, one of them mine.');
  reactions.set(reactedOften.id, [
    { emoji: '👍', count: 3, self: true },
    { emoji: '🎉', count: 2, self: false },
    { emoji: '❤️', count: 1, self: false },
  ]);

  const reactedGroupHead = at(carol, 'First of a run…');
  const reactedGroupTail = at(carol, '…and the reaction belongs to the second, not the first.', { gap: 10_000 });
  reactions.set(reactedGroupTail.id, [{ emoji: '👀', count: 1, self: true }]);

  const quoted = at(alice, 'Quote-replying to a message above.', { parentMessage: reactedOften });
  const quotedRunHead = at(bob, 'Two quote-replies in a row…', { parentMessage: own });
  const quotedRunTail = at(bob, '…each quoting a different message.', { gap: 10_000, parentMessage: single });

  const threadOne = at(bob, 'Has a thread with a single reply.');
  threads.set(threadOne.id, { replyCount: 1, lastActivity: new Date(base + offset + 60_000).toISOString() });

  const threadMany = at(carol, 'Has a busy, named thread.');
  threads.set(threadMany.id, {
    replyCount: 24,
    name: 'Release plan',
    lastActivity: new Date(base + offset + 45 * 60_000).toISOString(),
  });

  const threadGroupHead = at(alice, 'First of a run…');
  const threadGroupTail = at(alice, '…and the thread hangs off the second one.', { gap: 10_000 });
  threads.set(threadGroupTail.id, { replyCount: 3, lastActivity: new Date(base + offset + 120_000).toISOString() });

  const long = at(
    bob,
    'A longer message, to show how a paragraph wraps against the avatar rail and how the hover ' +
      'controls sit beside it: lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do ' +
      'eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  );

  return {
    messages: [
      single,
      own,
      groupHead,
      groupMiddle,
      groupTail,
      reactedOnce,
      reactedOften,
      reactedGroupHead,
      reactedGroupTail,
      quoted,
      quotedRunHead,
      quotedRunTail,
      threadOne,
      threadMany,
      threadGroupHead,
      threadGroupTail,
      long,
    ],
    reactions,
    threads,
  };
};
