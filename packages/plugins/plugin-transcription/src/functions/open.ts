//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ArtifactId } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { DatabaseService, QueueService, defineFunction } from '@dxos/functions';
import { DataType } from '@dxos/schema';

import { renderByline } from '../components';
import { Transcript } from '../types';

export default defineFunction({
  key: 'dxos.org/function/transcription/open',
  name: 'Open',
  description: 'Opens and reads the contents of a transcription object.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the transcription object.',
    }),
  }),
  outputSchema: Schema.Struct({
    content: Schema.String,
  }),
  handler: Effect.fn(function* ({ data: { id } }) {
    const transcript = yield* DatabaseService.resolve(ArtifactId.toDXN(id), Transcript.Transcript);
    const { dxn } = yield* Effect.promise(() => transcript.queue.load());
    const queue = yield* QueueService.getQueue(dxn);
    yield* Effect.promise(() => queue?.queryObjects());
    const content = queue?.objects
      .filter((message) => Obj.instanceOf(DataType.Message.Message, message))
      .flatMap((message, index) => renderByline([])(message, index))
      .join('\n\n');
    return { content };
  }),
});
