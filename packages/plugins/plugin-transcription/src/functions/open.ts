//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Obj, Type } from '@dxos/echo';
import { QueueService, defineFunction } from '@dxos/functions';
import { Message, Transcript } from '@dxos/types';

import { renderByline } from '../util';

export default defineFunction({
  key: 'dxos.org/function/transcription/open',
  name: 'Open',
  description: 'Opens and reads the contents of a transcription object.',
  inputSchema: Schema.Struct({
    transcript: Type.Ref(Transcript.Transcript).annotations({
      description: 'The ID of the transcription object.',
    }),
  }),
  outputSchema: Schema.Struct({
    content: Schema.String,
  }),
  handler: Effect.fn(function* ({ data: { transcript } }) {
    const transcriptObj = yield* Database.load(transcript);
    const { dxn } = yield* Effect.promise(() => transcriptObj.queue.load());
    const queue = yield* QueueService.getQueue(dxn);
    yield* Effect.promise(() => queue?.queryObjects());
    const content = queue?.objects
      .filter((message) => Obj.instanceOf(Message.Message, message))
      .flatMap((message, index) => renderByline([])(message, index))
      .join('\n\n');
    return { content };
  }),
});
