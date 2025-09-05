//
// Copyright 2025 DXOS.org
//

import { AiResponse } from '@effect/ai';
import { describe, it, vi } from '@effect/vitest';
import { Chunk, Effect, Function, Stream } from 'effect';

import { type ContentBlock } from '@dxos/schema';

import { parseResponse } from './AiParser';

describe('parser', () => {
  describe('accumulation', () => {
    it.effect(
      'single text block',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([text('Hello, world!')])
          .pipe(parseResponse())
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
        const result = yield* makeInputStream([text('Hello,'), text(' world!')])
          .pipe(parseResponse())
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
        const result = yield* makeInputStream([text('<status>I am thinking...</status>')])
          .pipe(parseResponse())
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
          text('Hello, world!'),
          new AiResponse.ToolCallPart({
            id: AiResponse.ToolCallId.make('123'),
            name: 'foo',
            params: { bar: 'baz' },
          }),
        ])
          .pipe(parseResponse())
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
            input: JSON.stringify({ bar: 'baz' }),
          },
        ]);
      }),
    );

    it.effect(
      'unterminated status tag followed by a tool call',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([
          text('<status>I am thinking...'),
          new AiResponse.ToolCallPart({
            id: AiResponse.ToolCallId.make('123'),
            name: 'foo',
            params: { bar: 'baz' },
          }),
        ])
          .pipe(parseResponse())
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
            input: JSON.stringify({ bar: 'baz' }),
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
          text('Hello, world!'),
        ])
          .pipe(parseResponse())
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

    it.effect(
      'COT tags get parsed to reasoning blocks',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([text('<cot>My thoughts are...</cot>')])
          .pipe(parseResponse({ parseReasoningTags: true }))
          .pipe(Stream.runCollect)
          .pipe(Effect.map(Chunk.toArray));

        expect(result).toEqual([
          {
            _tag: 'reasoning',
            reasoningText: 'My thoughts are...',
          },
        ] satisfies ContentBlock.Any[]);
      }),
    );

    it.effect(
      'think tags get parsed to reasoning blocks',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([text('<think>My thoughts are...</think>')])
          .pipe(parseResponse({ parseReasoningTags: true }))
          .pipe(Stream.runCollect)
          .pipe(Effect.map(Chunk.toArray));

        expect(result).toEqual([
          {
            _tag: 'reasoning',
            reasoningText: 'My thoughts are...',
          },
        ] satisfies ContentBlock.Any[]);
      }),
    );

    it.effect(
      'toolkit',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream(['<toolkit/>'].flatMap(splitByWord).map(text))
          .pipe(parseResponse())
          .pipe(Stream.runCollect)
          .pipe(Effect.map(Chunk.toArray));

        expect(result).toEqual([
          {
            _tag: 'toolkit',
          },
        ] satisfies ContentBlock.Any[]);
      }),
    );

    it.effect(
      'multi choice select',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream(
          ['<select><option>Yes</option><option>No</option></select>'].flatMap(splitByWord).map(text),
        )
          .pipe(parseResponse())
          .pipe(Stream.runCollect)
          .pipe(Effect.map(Chunk.toArray));

        expect(result).toEqual([
          {
            _tag: 'select',
            options: ['Yes', 'No'],
          },
        ] satisfies ContentBlock.Any[]);
      }),
    );

    it.effect(
      'works when every character is streamed individually',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream(
          [
            '<status>I am thinking...</status>',
            'Hello, world!',
            '<toolkit/>',
            '<suggestion>Yes</suggestion>',
            '<select><option>Yes</option><option>No</option></select>',
          ]
            .flatMap(splitByCharacter)
            .map(text),
        )
          .pipe(parseResponse())
          .pipe(Stream.runCollect)
          .pipe(Effect.map(Chunk.toArray));

        expect(result).toEqual([
          {
            _tag: 'status',
            statusText: 'I am thinking...',
          },
          {
            _tag: 'text',
            text: 'Hello, world!',
          },
          {
            _tag: 'toolkit',
          },
          {
            _tag: 'suggestion',
            text: 'Yes',
          },
          {
            _tag: 'select',
            options: ['Yes', 'No'],
          },
        ] satisfies ContentBlock.Any[]);
      }),
    );
  });

  describe('streaming', () => {
    const PARTS = [
      new AiResponse.ReasoningPart({ reasoningText: 'My thoughts are...' }),
      text('Hello, '),
      text('world!'),
      new AiResponse.ToolCallPart({
        id: AiResponse.ToolCallId.make('123'),
        name: 'foo',
        params: { bar: 'baz' },
      }),
    ];

    it.effect(
      'onPart is called with every part',
      Effect.fn(function* ({ expect }) {
        const onPart = vi.fn(Function.constant(Effect.void));
        yield* makeInputStream(PARTS).pipe(parseResponse({ onPart })).pipe(Stream.runCollect);
        expect(onPart.mock.calls).toEqual(PARTS.map((part) => [part]));
      }),
    );

    it.effect(
      'gets partial content blocks',
      Effect.fn(function* ({ expect }) {
        const onBlock = vi.fn(Function.constant(Effect.void));
        yield* makeInputStream(PARTS).pipe(parseResponse({ onBlock })).pipe(Stream.runCollect);
        expect(onBlock.mock.calls).toEqual(
          (
            [
              {
                _tag: 'reasoning',
                reasoningText: 'My thoughts are...',
              },
              {
                _tag: 'text',
                text: 'Hello, ',
                pending: true,
              },
              {
                _tag: 'text',
                text: 'Hello, world!',
                pending: true,
              },
              {
                _tag: 'text',
                text: 'Hello, world!',
              },
              {
                _tag: 'toolCall',
                toolCallId: '123',
                name: 'foo',
                input: '{"bar":"baz"}',
              },
            ] satisfies ContentBlock.Any[]
          ).map((block) => [block]),
        );
      }),
    );
  });
});

const makeInputStream = (parts: readonly AiResponse.Part[]): Stream.Stream<AiResponse.AiResponse, never, never> =>
  Stream.fromIterable(parts).pipe(Stream.map((part) => new AiResponse.AiResponse({ parts: [part] })));

const splitByWord = (text: string): string[] => text.split(/([ \t\n]+)/);
const splitByCharacter = (text: string): string[] => text.split('');

const text = (text: string) => new AiResponse.TextPart({ text });
