import { describe, it } from '@effect/vitest';
import { Chunk, Effect, Stream } from 'effect';
import { parseGptStream } from './parser';
import { AiResponse } from '@effect/ai';

describe('parser', () => {
  describe('accumulation', () => {
    it.effect(
      'single text block',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([
          //
          text('Hello, world!'),
        ])
          .pipe(parseGptStream())
          .pipe(Stream.runCollect)
          .pipe(Effect.map(Chunk.toArray));

        expect(result).toEqual([
          {
            _tag: 'text',
            text: 'Hello, world!',
          },
        ]);
      }),
    );

    it.effect(
      'consecutive text blocks get combined',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([
          //
          text('Hello,'),
          text(' world!'),
        ])
          .pipe(parseGptStream())
          .pipe(Stream.runCollect)
          .pipe(Effect.map(Chunk.toArray));

        expect(result).toEqual([
          {
            _tag: 'text',
            text: 'Hello, world!',
          },
        ]);
      }),
    );

    it.effect(
      'status parsed',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([
          //
          text('<status>I am thinking...</status>'),
        ])
          .pipe(parseGptStream())
          .pipe(Stream.runCollect)
          .pipe(Effect.map(Chunk.toArray));

        expect(result).toEqual([
          {
            _tag: 'status',
            statusText: 'I am thinking...',
          },
        ]);
      }),
    );

    it.effect(
      'text followed by a tool call',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([
          //
          text('Hello, world!'),
          new AiResponse.ToolCallPart({
            id: AiResponse.ToolCallId.make('123'),
            name: 'foo',
            params: { bar: 'baz' },
          }),
        ])
          .pipe(parseGptStream())
          .pipe(Stream.runCollect)
          .pipe(Effect.map(Chunk.toArray));

        expect(result).toEqual([
          {
            _tag: 'text',
            text: 'Hello, world!',
          },
          {
            _tag: 'toolCall',
            toolCallId: '123',
            name: 'foo',
            input: { bar: 'baz' },
          },
        ]);
      }),
    );

    it.effect(
      'unterminated status tag followed by a tool call',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([
          //
          text('<status>I am thinking...'),
          new AiResponse.ToolCallPart({
            id: AiResponse.ToolCallId.make('123'),
            name: 'foo',
            params: { bar: 'baz' },
          }),
        ])
          .pipe(parseGptStream())
          .pipe(Stream.runCollect)
          .pipe(Effect.map(Chunk.toArray));

        expect(result).toEqual([
          {
            _tag: 'status',
            statusText: 'I am thinking...',
          },
          {
            _tag: 'toolCall',
            toolCallId: '123',
            name: 'foo',
            input: { bar: 'baz' },
          },
        ]);
      }),
    );

    it.effect(
      'reasoning gets passed through',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([
          new AiResponse.ReasoningPart({
            reasoningText: 'My thoughts are...',
          }),
          //
          text('Hello, world!'),
        ])
          .pipe(parseGptStream())
          .pipe(Stream.runCollect)
          .pipe(Effect.map(Chunk.toArray));

        expect(result).toEqual([
          {
            _tag: 'reasoning',
            reasoningText: 'My thoughts are...',
          },
          {
            _tag: 'text',
            text: 'Hello, world!',
          },
        ]);
      }),
    );
  });

  describe('streaming', () => {
    it.effect(
      'onPart is called with every part',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([text('Hello, world!')])
          .pipe(parseGptStream({ onPart: Effect.log }))
          .pipe(Stream.runCollect);
      }),
    );
  });
});

const makeInputStream = (parts: readonly AiResponse.Part[]): Stream.Stream<AiResponse.AiResponse, never, never> =>
  Stream.fromIterable(parts).pipe(Stream.map((part) => new AiResponse.AiResponse({ parts: [part] })));

const text = (text: string) => new AiResponse.TextPart({ text });
