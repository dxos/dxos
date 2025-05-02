//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { AIServiceEdgeClient } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { scheduleTaskInterval } from '@dxos/async';
import { createQueueDxn, type Queue } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { AST, create, EchoObject, ObjectId, S } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { live, makeRef, useQueue, type Space } from '@dxos/react-client/echo';
import { hues } from '@dxos/react-ui-theme';
import { ContactType } from '@dxos/schema';

import * as TestData from './test-data';
import { processTranscriptBlock } from '../entity-extraction';
import { TranscriptBlock } from '../types';

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

// TODO(ZaymonFC): Generalize builder for enriched markdown.
abstract class AbstractBlockBuilder {
  abstract createBlock(numSegments?: number): Promise<TranscriptBlock>;
}

/**
 * Generator of transcript blocks.
 */
export class BlockBuilder extends AbstractBlockBuilder {
  static readonly singleton = new BlockBuilder();

  users = Array.from({ length: 5 }, () => ({
    authorName: faker.person.fullName(),
    authorHue: faker.helpers.arrayElement(hues),
  }));

  start = new Date(Date.now() - 24 * 60 * 60 * 10_000);

  constructor(private readonly _space?: Space) {
    super();
  }

  override async createBlock(numSegments = 1): Promise<TranscriptBlock> {
    return {
      id: ObjectId.random().toString(),
      ...faker.helpers.arrayElement(this.users),
      segments: Array.from({ length: numSegments }).map(() => this.createSegment()),
    };
  }

  createSegment() {
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
class EntityExtractionBlockBuilder extends AbstractBlockBuilder {
  aiService = new AIServiceEdgeClient({
    endpoint: AI_SERVICE_ENDPOINT.REMOTE,
  });

  currentBlock: number = 0;

  seedData(space: Space) {
    if (!space.db.graph.schemaRegistry.hasSchema(ContactType)) {
      space.db.graph.schemaRegistry.addSchema([ContactType]);
    }
    // for (const document of TestData.documents) {
    //   const obj = space.db.add(live(Document, document));
    //   const dxn = makeRef(obj).dxn.toString();
    //   document.dxn = dxn;
    // }

    for (const contact of Object.values(TestData.contacts)) {
      space.db.add(contact);
    }
  }

  override async createBlock(): Promise<TranscriptBlock> {
    const block = TestData.transcriptBlocks[this.currentBlock];
    this.currentBlock++;
    this.currentBlock = this.currentBlock % TestData.transcriptBlocks.length;

    const { block: enhancedBlock } = await processTranscriptBlock({
      block,
      aiService: this.aiService,
      context: {
        objects: [...TestData.documents, ...Object.values(TestData.contacts)],
      },
    });

    return enhancedBlock;
  }
}

type UseTestTranscriptionQueue = (
  space: Space | undefined,
  queueId?: ObjectId,
  running?: boolean,
  interval?: number,
) => Queue<TranscriptBlock> | undefined;

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
  const queue = useQueue<TranscriptBlock>(queueDxn);
  const builder = useMemo(() => new BlockBuilder(space), [space]);
  useEffect(() => {
    if (!queue || !running) {
      return;
    }

    const i = setInterval(() => {
      void builder.createBlock(Math.ceil(Math.random() * 3)).then((block) => {
        queue.append([create(TranscriptBlock, block)]);
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
  const queue = useQueue<TranscriptBlock>(queueDxn);
  const [builder] = useState(() => new EntityExtractionBlockBuilder());

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
        const block = await builder.createBlock();
        queue.append([create(TranscriptBlock, block)]);
      },
      interval,
    );

    return () => {
      void ctx.dispose();
    };
  }, [space, queue, running, interval]);

  return queue;
};
