//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { AST, create, EchoObject, ObjectId, S } from '@dxos/echo-schema';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { faker } from '@dxos/random';
import { live, makeRef, useQueue, type Space } from '@dxos/react-client/echo';
import { hues } from '@dxos/react-ui-theme';

import { TranscriptBlock } from '../../types';

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
/**
 * Generator of transcript blocks.
 */
export class BlockBuilder {
  static readonly singleton = new BlockBuilder();

  users = Array.from({ length: 5 }, () => ({
    authorName: faker.person.fullName(),
    authorHue: faker.helpers.arrayElement(hues),
  }));

  start = new Date(Date.now() - 24 * 60 * 60 * 10_000);

  constructor(private readonly _space?: Space) {}

  createBlock(numSegments = 1): TranscriptBlock {
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

/**
 * Test transcriptionqueue.
 */
export const useTestTranscriptionQueue = (space: Space | undefined, running = true, interval = 1_000) => {
  const queueDxn = useMemo(
    () => (space ? new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, space.id, ObjectId.random()]) : undefined),
    [space],
  );
  const queue = useQueue<TranscriptBlock>(queueDxn);

  const builder = useMemo(() => new BlockBuilder(space), [space]);
  useEffect(() => {
    if (!queue || !running) {
      return;
    }

    const i = setInterval(() => {
      queue.append([create(TranscriptBlock, builder.createBlock(Math.ceil(Math.random() * 3)))]);
    }, interval);
    return () => clearInterval(i);
  }, [queue, running, interval]);

  return queue;
};
