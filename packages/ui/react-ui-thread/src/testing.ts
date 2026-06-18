//
// Copyright 2024 DXOS.org
//

import { Obj } from '@dxos/echo';
import { random } from '@dxos/random';
import { type ValueGenerator, createGenerator } from '@dxos/schema/testing';
import { Message } from '@dxos/types';
import { hexToFallback } from '@dxos/util';

import { type MessageMetadata } from './types';

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
  return objectGenerator.createObjects(count).map((message, index) => {
    const author = authors[index % authors.length];
    Obj.update(message, (message) => {
      message.sender = { role: 'user', identityDid: author.did, name: author.name };
      message.blocks = [{ _tag: 'text', text: random.lorem.paragraph() }];
    });
    return message;
  });
};

/** Story metadata resolver mapping a message's sender to presentational fields. */
export const getStoryMetadata = (message: Message.Message): MessageMetadata => {
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
