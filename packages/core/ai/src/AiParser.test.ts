//
// Copyright 2025 DXOS.org
//

import { Response } from '@effect/ai';
import { describe, it, vi } from '@effect/vitest';
import { Chunk, Effect, Function, Stream } from 'effect';

import { type ContentBlock } from '@dxos/schema';

import { parseResponse } from './AiParser';

describe('parser', () => {
  describe('accumulation', () => {
    it.effect(
      'single text block',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([...text(['Hello, world!'])])
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
        const result = yield* makeInputStream([...text(['Hello,', ' world!'])])
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
        const result = yield* makeInputStream([...text(['<status>I am thinking...</status>'])])
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
          ...text(['Hello, world!']),
          Response.makePart('tool-call', {
            id: '123',
            name: 'foo',
            params: { bar: 'baz' },
            providerExecuted: false,
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
            providerExecuted: false,
          },
        ]);
      }),
    );

    it.effect(
      'unterminated status tag followed by a tool call',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([
          ...text(['<status>I am thinking...']),
          Response.makePart('tool-call', {
            id: '123',
            name: 'foo',
            params: { bar: 'baz' },
            providerExecuted: false,
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
            providerExecuted: false,
          },
        ]);
      }),
    );

    it.effect(
      'reasoning gets passed through',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([...reasoning('My thoughts are...'), ...text(['Hello, world!'])])
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
        const result = yield* makeInputStream([...text(['<cot>My thoughts are...</cot>'])])
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
        const result = yield* makeInputStream([...text(['<think>My thoughts are...</think>'])])
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
        const result = yield* makeInputStream([...text(splitByWord('<toolkit/>'))])
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
        const result = yield* makeInputStream([
          ...text(splitByWord('<select><option>Yes</option><option>No</option></select>')),
        ])
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
        const result = yield* makeInputStream([
          ...text(
            splitByCharacter(
              [
                '<status>I am thinking...</status>',
                'Hello, world!',
                '<toolkit/>',
                '<suggestion>Yes</suggestion>',
                '<select><option>Yes</option><option>No</option></select>',
              ].join(''),
            ),
          ),
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
    const PARTS: Response.StreamPart<any>[] = [
      ...reasoning('My thoughts are...'),
      ...text(['Hello, ', 'world!']),
      Response.makePart('tool-call', {
        id: '123',
        name: 'foo',
        params: { bar: 'baz' },
        providerExecuted: false,
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
                reasoningText: '',
                pending: true,
              },
              {
                _tag: 'reasoning',
                reasoningText: 'My thoughts are...',
                pending: true,
              },
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
                providerExecuted: false,
              },
            ] satisfies ContentBlock.Any[]
          ).map((block) => [block]),
        );
      }),
    );
  });
});

const makeInputStream = (
  parts: readonly Response.StreamPart<any>[],
): Stream.Stream<Response.StreamPart<any>, never, never> => Stream.fromIterable(parts);

const splitByWord = (text: string): string[] => text.split(/([ \t\n]+)/);
const splitByCharacter = (text: string): string[] => text.split('');

let idGenerator = 0;
const text = (text: string[]): Iterable<Response.StreamPart<any>> => {
  const id = String(idGenerator++);
  return [
    Response.makePart('text-start', { id }),
    ...text.map((delta) => Response.makePart('text-delta', { id, delta })),
    Response.makePart('text-end', { id }),
  ];
};

const reasoning = (text: string): Iterable<Response.StreamPart<any>> => {
  const id = String(idGenerator++);
  return [
    Response.makePart('reasoning-start', { id }),
    Response.makePart('reasoning-delta', { id, delta: text }),
    Response.makePart('reasoning-end', { id }),
  ];
};
