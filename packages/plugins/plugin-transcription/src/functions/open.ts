//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { ArtifactId } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { DatabaseService, QueueService, defineFunction } from '@dxos/functions';
import { DataType } from '@dxos/schema';

import { renderMarkdown } from '../components';
import { Transcript } from '../types';

export default defineFunction({
  name: 'dxos.org/function/transcription/open',
  description: 'Opens and reads the contents of a transcription object.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the transcription object.',
    }),
  }),
  outputSchema: Schema.Struct({
    content: Schema.String,
  }),
  handler: Effect.fn(function* ({ data: { id }, context: { space } }) {
    const transcript = yield* DatabaseService.resolve(ArtifactId.toDXN(id), Transcript.Transcript);
    const { dxn: queueDxn } = yield* Effect.promise(() => transcript.queue.load());
    const queue = yield* QueueService.getQueue(queueDxn);
    yield* Effect.promise(() => queue?.queryObjects());
    const content = queue?.objects
      .filter((message) => Obj.instanceOf(DataType.Message, message))
      .flatMap((message, index) => renderMarkdown([])(message, index))
      .join('\n\n');
    return { content };
  }),
});
