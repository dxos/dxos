//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { useEffect, useMemo, useState } from 'react';

import { AIServiceEdgeClient } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT } from '@dxos/ai/testing';
import { processTranscriptMessage } from '@dxos/assistant';
import { scheduleTaskInterval } from '@dxos/async';
import { Filter, type Queue } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { Type } from '@dxos/echo';
import { create, createQueueDxn, ObjectId } from '@dxos/echo-schema';
import { IdentityDid } from '@dxos/keys';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { live, makeRef, useQueue, type Space } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';
import { Testing, seedTestData } from '@dxos/schema/testing';

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
}).pipe(
  Type.def({
    typename: 'dxos.org/type/Test',
    version: '0.1.0',
  }),
);

// TODO(wittjosiah): Make builder generic and reuse for all message types.
abstract class AbstractMessageBuilder {
  abstract createMessage(numSegments?: number): Promise<DataType.Message>;
}

/**
 * Generator of transcript messages.
 */
export class MessageBuilder extends AbstractMessageBuilder {
  static readonly singleton = new MessageBuilder();

  users = Array.from({ length: 5 }, () => ({
    identityDid: IdentityDid.random().toString(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
  }));

  start = new Date(Date.now() - 24 * 60 * 60 * 10_000);

  constructor(private readonly _space?: Space) {
    super();
  }

  override async createMessage(numSegments = 1): Promise<DataType.Message> {
    return {
      id: ObjectId.random().toString(),
      created: this.next().toISOString(),
      sender: faker.helpers.arrayElement(this.users),
      blocks: Array.from({ length: numSegments }).map(() => this.createBlock()),
    };
  }

  createBlock(): DataType.MessageBlock.Transcription {
    let text = faker.lorem.paragraph();
    if (this._space) {
      const label = faker.commerce.productName();
      const obj = this._space.db.add(live(TestItem, { title: label, description: faker.lorem.paragraph() }));
      const dxn = makeRef(obj).dxn.toString();
      const words = text.split(' ');
      words.splice(Math.floor(Math.random() * words.length), 0, `[${label}][${dxn}]`);
      text = words.join(' ');
    }

    return {
      type: 'transcription',
      started: this.next().toISOString(),
      text,
    };
  }

  next(): Date {
    this.start = new Date(this.start.getTime() + Math.random() * 10_000);
    return this.start;
  }
}

// TODO(burdon): Reconcile with BlockBuilder.
class EntityExtractionMessageBuilder extends AbstractMessageBuilder {
  aiService = new AIServiceEdgeClient({
    endpoint: AI_SERVICE_ENDPOINT.REMOTE,
  });

  space: Space | undefined;
  currentMessage: number = 0;
  transcriptMessages: DataType.Message[] = [];

  async connect(space: Space): Promise<void> {
    this.space = space;
    const { transcriptMessages } = await seedTestData(space);
    this.transcriptMessages = transcriptMessages;
  }

  override async createMessage(): Promise<DataType.Message> {
    if (!this.space) {
      throw new Error('Space not connected');
    }

    const { objects } = await this.space.db
      .query(
        Filter.or(Filter.type(DataType.Person), Filter.type(DataType.Organization), Filter.type(Testing.DocumentType)),
      )
      .run();

    log.info('context', { objects });
    const message = this.transcriptMessages[this.currentMessage];
    this.currentMessage++;
    this.currentMessage = this.currentMessage % this.transcriptMessages.length;

    const { message: enhancedMessage } = await processTranscriptMessage({
      message,
      aiService: this.aiService,
      context: {
        objects,
      },
    });

    return enhancedMessage;
  }
}

type UseTestTranscriptionQueue = (
  space: Space | undefined,
  queueId?: ObjectId,
  running?: boolean,
  interval?: number,
) => Queue<DataType.Message> | undefined;

/**
 * Test transcriptionqueue.
 */
export const useTestTranscriptionQueue: UseTestTranscriptionQueue = (
  space: Space | undefined,
  queueId?: ObjectId,
  running = true,
  interval = 1_000,
) => {
  const queueDxn = useMemo(() => (space ? createQueueDxn(space.id, queueId) : undefined), [space, queueId]);
  const queue = useQueue<DataType.Message>(queueDxn);
  const builder = useMemo(() => new MessageBuilder(space), [space]);

  useEffect(() => {
    if (!queue || !running) {
      return;
    }

    const i = setInterval(() => {
      void builder.createMessage(Math.ceil(Math.random() * 3)).then((message) => {
        queue.append([create(DataType.Message, message)]);
      });
    }, interval);
    return () => clearInterval(i);
  }, [queue, running, interval]);

  return queue;
};

/**
 * Test transcription queue.
 */
// TODO(burdon): Reconcile with useTestTranscriptionQueue.
export const useTestTranscriptionQueueWithEntityExtraction: UseTestTranscriptionQueue = (
  space: Space | undefined,
  queueId?: ObjectId,
  running = true,
  interval = 1_000,
) => {
  const queueDxn = useMemo(() => (space ? createQueueDxn(space.id, queueId) : undefined), [space, queueId]);
  const queue = useQueue<DataType.Message>(queueDxn);
  const [builder] = useState(() => new EntityExtractionMessageBuilder());

  useEffect(() => {
    if (!queue || !running) {
      return;
    }

    if (space) {
      void builder.connect(space);
    }

    const ctx = new Context();
    scheduleTaskInterval(
      ctx,
      async () => {
        const message = await builder.createMessage();
        queue.append([create(DataType.Message, message)]);
      },
      interval,
    );

    return () => {
      void ctx.dispose();
    };
  }, [space, queue, running, interval]);

  return queue;
};
