//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { useEffect, useMemo } from 'react';

import { createFeedServiceLayer, type Space } from '@dxos/client/echo';
import { DXN, Feed, Obj, Ref, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { IdentityDid } from '@dxos/keys';
import { random } from '@dxos/random';
import { type ContentBlock, Message } from '@dxos/types';

// TODO(burdon): Reconcile with plugin-markdown. Move to @dxos/schema/testing.
export const TestItem = Schema.Struct({
  title: Schema.String.annotations({
    title: 'Title',
    description: 'Product title',
  }),
  description: Schema.String.annotations({
    title: 'Description',
    description: 'Product description',
  }),
}).pipe(Type.makeObject(DXN.make('org.dxos.type.test', '0.1.0')));

// TODO(wittjosiah): Make builder generic and reuse for all message types.
abstract class AbstractMessageBuilder {
  abstract createMessage(numSegments?: number): Promise<Message.Message>;
}

/**
 * Generator of transcript messages.
 */
export class MessageBuilder extends AbstractMessageBuilder {
  static readonly singleton = new MessageBuilder();

  users = Array.from({ length: 5 }, () => ({
    identityDid: IdentityDid.random().toString(),
    name: random.person.fullName(),
    email: random.internet.email(),
  }));

  start = new Date(Date.now() - 24 * 60 * 60 * 10_000);

  constructor(private readonly _space?: Space) {
    super();
  }

  override async createMessage(numSegments = 1): Promise<Message.Message> {
    return Obj.make(Message.Message, {
      created: this.next().toISOString(),
      sender: random.helpers.arrayElement(this.users),
      blocks: Array.from({ length: numSegments }).map(() => this.createBlock()),
    });
  }

  createBlock(): ContentBlock.Transcript {
    let text = random.lorem.paragraph();
    if (this._space) {
      const label = random.commerce.productName();
      const obj = this._space.db.add(
        Obj.make(TestItem, {
          title: label,
          description: random.lorem.paragraph(),
        }),
      );
      const dxn = Ref.make(obj).uri;
      const words = text.split(' ');
      words.splice(Math.floor(Math.random() * words.length), 0, `[${label}](${dxn})`);
      text = words.join(' ');
    }

    return {
      _tag: 'transcript',
      started: this.next().toISOString(),
      text,
    };
  }

  next(): Date {
    this.start = new Date(this.start.getTime() + Math.random() * 10_000);
    return this.start;
  }
}

type UseTestTranscriptionQueue = (
  space: Space | undefined,
  running?: boolean,
  interval?: number,
) => Feed.Feed | undefined;

/**
 * Test transcription feed.
 */
export const useTestTranscriptionQueue: UseTestTranscriptionQueue = (
  space: Space | undefined,
  running = true,
  interval = 1_000,
) => {
  const feed = useMemo(() => (space ? space.db.add(Feed.make({ name: 'transcription' })) : undefined), [space]);
  const builder = useMemo(() => new MessageBuilder(space), [space]);

  useEffect(() => {
    if (!space || !feed || !running) {
      return;
    }
    const feedServiceLayer = createFeedServiceLayer(space.queues);

    const i = setInterval(() => {
      void builder.createMessage(Math.ceil(Math.random() * 3)).then(async (message) => {
        await Feed.append(feed, [message]).pipe(Effect.provide(feedServiceLayer), EffectEx.runAndForwardErrors);
      });
    }, interval);
    return () => clearInterval(i);
  }, [space, feed, running, interval]);

  return feed;
};
