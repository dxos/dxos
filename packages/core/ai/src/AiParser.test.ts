//
// Copyright 2025 DXOS.org
//

import * as Response from '@effect/ai/Response';
import { describe, it, vi } from '@effect/vitest';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Stream from 'effect/Stream';

import { type ContentBlock } from '@dxos/types';

import * as AiParser from './AiParser';

describe('parser', () => {
  describe('accumulation', () => {
    it.effect(
      'single text block',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([...text(['Hello, world!'])])
          .pipe(AiParser.parseResponse())
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
          .pipe(AiParser.parseResponse())
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
          .pipe(AiParser.parseResponse())
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
        const result = yield* makeInputStream([...text(['Hello, world!']), ...toolCall('123', 'foo', { bar: 'baz' })])
          .pipe(AiParser.parseResponse())
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
          ...toolCall('123', 'foo', { bar: 'baz' }),
        ])
          .pipe(AiParser.parseResponse())
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
          .pipe(AiParser.parseResponse())
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
          .pipe(AiParser.parseResponse({ parseReasoningTags: true }))
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
          .pipe(AiParser.parseResponse({ parseReasoningTags: true }))
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
          .pipe(AiParser.parseResponse())
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
          .pipe(AiParser.parseResponse())
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

    // Regression: an unrecognized XML-style tag in the model's text response (e.g. the user
    // asks "respond with your name inside an xml tag" and the model emits `<name>Claude</name>`)
    // used to be silently dropped because `makeContentBlock` returned `undefined` for any tag
    // not in `ModelTags`. The parser must instead preserve the original text.
    it.effect(
      'unknown xml-style tag is preserved as literal text',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([...text(['<name>Claude</name>'])])
          .pipe(AiParser.parseResponse())
          .pipe(Stream.runCollect)
          .pipe(Effect.map(Chunk.toArray));

        expect(result).toEqual([
          {
            _tag: 'text',
            text: '<name>Claude</name>',
          },
        ] satisfies ContentBlock.Any[]);
      }),
    );

    // Regression: an *unclosed* unrecognized tag must NOT have a synthetic `</tag>`
    // appended. Reconstructing one corrupts the response text — the chat doc would render
    // a phantom close tag mid-message and confuse downstream parsers.
    it.effect(
      'unclosed unknown xml-style tag is preserved without a synthetic close',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([...text(['You sent `<foo>`, which looks like a tag'])])
          .pipe(AiParser.parseResponse())
          .pipe(Stream.runCollect)
          .pipe(Effect.map(Chunk.toArray));

        expect(result).toEqual([
          { _tag: 'text', text: 'You sent `' },
          { _tag: 'text', text: '<foo>`, which looks like a tag' },
        ] satisfies ContentBlock.Any[]);
      }),
    );

    // Regression: the model writes a sentence that contains an unrecognized tag — the
    // surrounding text plus the tag must all be preserved (the tag splits the stream into
    // separate text blocks at the state-machine boundaries, but no content is dropped).
    it.effect(
      'unknown xml-style tag mixed with surrounding text is preserved',
      Effect.fn(function* ({ expect }) {
        const result = yield* makeInputStream([...text(['My name is <name>Claude</name>.'])])
          .pipe(AiParser.parseResponse())
          .pipe(Stream.runCollect)
          .pipe(Effect.map(Chunk.toArray));

        expect(result).toEqual([
          { _tag: 'text', text: 'My name is ' },
          { _tag: 'text', text: '<name>Claude</name>' },
          { _tag: 'text', text: '.' },
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
          .pipe(AiParser.parseResponse())
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
      ...toolCall('123', 'foo', { bar: 'baz' }),
    ];

    it.effect(
      'onPart is called with every part',
      Effect.fn(function* ({ expect }) {
        const onPart = vi.fn(Function.constant(Effect.void));
        yield* makeInputStream(PARTS).pipe(AiParser.parseResponse({ onPart })).pipe(Stream.runCollect);
        expect(onPart.mock.calls).toEqual(PARTS.map((part) => [part]));
      }),
    );

    it.effect(
      'gets partial content blocks',
      Effect.fn(function* ({ expect }) {
        const onBlock = vi.fn(Function.constant(Effect.void));
        yield* makeInputStream(PARTS).pipe(AiParser.parseResponse({ onBlock })).pipe(Stream.runCollect);
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
                input: '',
                pending: true,
                providerExecuted: false,
              },
              {
                _tag: 'toolCall',
                toolCallId: '123',
                name: 'foo',
                input: '{"bar":"baz"}',
                pending: true,
                providerExecuted: false,
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

const toolCall = (id: string, name: string, params: Record<string, unknown>): Iterable<Response.StreamPart<any>> => {
  return [
    Response.makePart('tool-params-start', { id, name, providerExecuted: false }),
    Response.makePart('tool-params-delta', { id, delta: JSON.stringify(params) }),
    Response.makePart('tool-params-end', { id }),
  ];
};
