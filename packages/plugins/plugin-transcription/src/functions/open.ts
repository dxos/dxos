//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { QueueService } from '@dxos/functions';
import { Operation } from '@dxos/operation';
import { Message } from '@dxos/types';

import { Open } from './definitions';
import { renderByline } from '../util';

export default Open.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ transcript }) {
  const transcriptObj = yield* Database.load(transcript);
  const { dxn } = yield* Effect.promise(() => transcriptObj.queue.load());
  const queue = yield* QueueService.getQueue(dxn);
  yield* Effect.promise(() => queue?.queryObjects());
  const content = queue?.objects
    .filter((message: unknown) => Obj.instanceOf(Message.Message, message))
    .flatMap((message: Message.Message, index: number) => renderByline([])(message, index))
    .join('\n\n');
  return { content };
}),
  ),
);
