//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { AIServiceEdgeClient } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { scheduleTaskInterval } from '@dxos/async';
import { createQueueDxn, Filter, type Queue } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { AST, create, EchoObject, ObjectId, S } from '@dxos/echo-schema';
import { IdentityDid } from '@dxos/keys';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { live, makeRef, useQueue, type Space } from '@dxos/react-client/echo';
import { Contact, MessageType, Organization, type TranscriptionContentBlock } from '@dxos/schema';

import * as TestData from './test-data';
import { processTranscriptMessage } from '../entity-extraction';

// TODO(burdon): Reconcile with plugin-markdown. Move to schema-testing.
export const TestItem = S.Struct({
  title: S.String.annotations({
    [AST.TitleAnnotationId]: 'Title',
    [AST.DescriptionAnnotationId]: 'Product title',
  }),
  description: S.String.annotations({
    [AST.TitleAnnotationId]: 'Description',
    [AST.DescriptionAnnotationId]: 'Product description',
  }),
}).pipe(EchoObject({ typename: 'dxos.org/type/Test', version: '0.1.0' }));

// TODO(wittjosiah): Make builder generic and reuse for all message types.
abstract class AbstractMessageBuilder {
  abstract createMessage(numSegments?: number): Promise<MessageType>;
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

  override async createMessage(numSegments = 1): Promise<MessageType> {
    return {
      id: ObjectId.random().toString(),
      created: this.next().toISOString(),
      sender: faker.helpers.arrayElement(this.users),
      blocks: Array.from({ length: numSegments }).map(() => this.createBlock()),
    };
  }

  createBlock(): TranscriptionContentBlock {
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

  next() {
    this.start = new Date(this.start.getTime() + Math.random() * 10_000);
    return this.start;
  }
}

// TODO(burdon): Reconcile with BlockBuilder.
class EntityExtractionMessageBuilder extends AbstractMessageBuilder {
  aiService = new AIServiceEdgeClient({
    endpoint: AI_SERVICE_ENDPOINT.REMOTE,
  });

  currentMessage: number = 0;

  space: Space | undefined;

  transcriptMessages: MessageType[] = [];

  async connect(space: Space) {
    this.space = space;
    const { transcriptMessages } = await TestData.seed(space);
    this.transcriptMessages = transcriptMessages;
  }

  override async createMessage(): Promise<MessageType> {
    if (!this.space) {
      throw new Error('Space not connected');
    }
    const { objects } = await this.space.db
      .query(Filter.or(Filter.schema(Contact), Filter.schema(Organization), Filter.schema(TestData.DocumentType)))
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
) => Queue<MessageType> | undefined;

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
  const queue = useQueue<MessageType>(queueDxn);
  const builder = useMemo(() => new MessageBuilder(space), [space]);

  useEffect(() => {
    if (!queue || !running) {
      return;
    }

    const i = setInterval(() => {
      void builder.createMessage(Math.ceil(Math.random() * 3)).then((message) => {
        queue.append([create(MessageType, message)]);
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
  const queue = useQueue<MessageType>(queueDxn);
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
        queue.append([create(MessageType, message)]);
      },
      interval,
    );

    return () => {
      void ctx.dispose();
    };
  }, [space, queue, running, interval]);

  return queue;
};
