//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { AIServiceEdgeClient } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { AST, create, EchoObject, ObjectId, S } from '@dxos/echo-schema';
import { DXN, IdentityDid, QueueSubspaceTags } from '@dxos/keys';
import { faker } from '@dxos/random';
import { live, makeRef, useQueue, type Space } from '@dxos/react-client/echo';
import { SpaceId } from '@dxos/react-client/echo';
import { ContactType, MessageType, type TranscriptionContentBlock } from '@dxos/schema';

import { processTranscriptMessage } from '../../entity-extraction';
import * as TestData from '../../testing/test-data';

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
/**
 * Generator of transcript messages.
 */
export class MessageBuilder {
  static readonly singleton = new MessageBuilder();

  users = Array.from({ length: 5 }, () => ({
    identityDid: IdentityDid.random().toString(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
  }));

  start = new Date(Date.now() - 24 * 60 * 60 * 10_000);

  constructor(private readonly _space?: Space) {}

  createMessage(numSegments = 1): MessageType {
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

/**
 * Test transcriptionqueue.
 */
export const useTestTranscriptionQueue = (space: Space | undefined, running = true, interval = 1_000) => {
  const queueDxn = useMemo(
    () => (space ? new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, space.id, ObjectId.random()]) : undefined),
    [space],
  );
  const queue = useQueue<MessageType>(queueDxn);

  const builder = useMemo(() => new MessageBuilder(space), [space]);
  useEffect(() => {
    if (!queue || !running) {
      return;
    }

    const i = setInterval(() => {
      queue.append([create(MessageType, builder.createMessage(Math.ceil(Math.random() * 3)))]);
    }, interval);
    return () => clearInterval(i);
  }, [queue, running, interval]);

  return queue;
};

class EntityExtractionMessageBuilder {
  aiService = new AIServiceEdgeClient({
    endpoint: AI_SERVICE_ENDPOINT.REMOTE,
  });

  currentMessage: number = 0;

  seedData(space: Space) {
    space.db.graph.schemaRegistry.addSchema([ContactType]);
    // for (const document of TestData.documents) {
    //   const obj = space.db.add(live(Document, document));
    //   const dxn = makeRef(obj).dxn.toString();
    //   document.dxn = dxn;
    // }

    for (const contact of Object.values(TestData.contacts)) {
      space.db.add(contact);
    }
  }

  async createMessage(): Promise<MessageType> {
    const message = TestData.transcriptMessages[this.currentMessage];
    this.currentMessage++;
    this.currentMessage = this.currentMessage % TestData.transcriptMessages.length;

    const { message: enhancedMessage } = await processTranscriptMessage({
      message,
      aiService: this.aiService,
      context: {
        objects: [...TestData.documents, ...Object.values(TestData.contacts)],
      },
    });
    return enhancedMessage;
  }
}

const randomQueueDXN = (spaceId = SpaceId.random()) =>
  new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, ObjectId.random()]);

/**
 * Test transcription queue.
 */
export const useTestTranscriptionQueueWithEntityExtraction = (
  space: Space | undefined,
  running = true,
  interval = 1_000,
) => {
  const queueDxn = useMemo(() => (space ? randomQueueDXN(space.id) : undefined), [space]);
  const queue = useQueue<MessageType>(queueDxn);
  const [builder] = useState(() => new EntityExtractionMessageBuilder());

  useEffect(() => {
    if (!queue || !running) {
      return;
    }

    if (space) {
      builder.seedData(space);
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
