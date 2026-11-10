//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Feed, Filter } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Message } from '@dxos/types';

import { TranscriptSink } from './transcript-sink.ts';

const segment = (text: string) => ({ _tag: 'transcript' as const, started: new Date().toISOString(), text });

describe('TranscriptSink', () => {
  it.effect(
    'appends in spoken order even when a stage is slower for an earlier segment',
    Effect.fnUntraced(
      function* () {
        const { db } = yield* Database.Service;
        const feed = db.add(Feed.make());
        const sink = new TranscriptSink({
          resolveTarget: async () => ({ db, feed }),
          stages: [
            async (message) => {
              // The first segment takes longest to enrich.
              const delay = message.blocks.some((block) => block._tag === 'transcript' && block.text === 'one')
                ? 30
                : 0;
              await new Promise((resolve) => setTimeout(resolve, delay));
              return message;
            },
          ],
        });

        void sink.write(segment('one'), { name: 'Speaker' });
        void sink.write(segment('two'), { name: 'Speaker' });
        void sink.write(segment('three'), { name: 'Speaker' });
        yield* Effect.promise(() => sink.flush());

        const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
        expect(
          messages.flatMap((message) => message.blocks.map((block) => (block._tag === 'transcript' ? block.text : ''))),
        ).toEqual(['one', 'two', 'three']);
      },
      Effect.provide(TestDatabaseLayer({ types: [Feed.Feed, Message.Message] })),
    ),
  );

  it.effect(
    'drops a segment when there is no meeting to write it to',
    Effect.fnUntraced(function* () {
      const sink = new TranscriptSink({ resolveTarget: async () => undefined });
      yield* Effect.promise(() => sink.write(segment('lost'), { name: 'Speaker' }));
    }),
  );
});
