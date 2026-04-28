//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import * as TestContext from 'effect/TestContext';

import { type StreamerOptions, createStreamer, splitFragments, splitSentences, splitSpans } from './stream';

describe('stream', () => {
  it.effect('tokenize tags', ({ expect }) =>
    Effect.gen(function* () {
      {
        expect(splitSpans('A\n<test />\nB')).toEqual(['A\n', '<test />', '\nB']);
        expect(splitSpans('A\n<test>hello</test>\nB')).toEqual(['A\n', '<test>', 'hello', '</test>', '\nB']);
      }
    }),
  );

  it.effect('tokenize fragments', ({ expect }) =>
    Effect.gen(function* () {
      {
        expect(splitFragments('A\n<toolkit />\nB')).toEqual(['A\n', '<toolkit />', '\nB']);
        expect(splitFragments('A\n<suggestion>Test</suggestion>\nB')).toEqual([
          'A\n',
          '<suggestion>Test</suggestion>',
          '\nB',
        ]);
        expect(splitFragments('A\n<select><option /><option>Test</option></select>\nB')).toEqual([
          'A\n',
          '<select><option /><option>Test</option></select>',
          '\nB',
        ]);
        // Hyphenated custom element names must resolve to the correct closing tag.
        expect(splitFragments('A\n<dom-widget>Hello</dom-widget>\nB')).toEqual([
          'A\n',
          '<dom-widget>Hello</dom-widget>',
          '\nB',
        ]);
      }
    }),
  );

  it.effect('split sentences', ({ expect }) =>
    Effect.gen(function* () {
      expect(splitSentences('Hello world. What a nice day!\nLooking great.')).toEqual([
        'Hello world. ',
        'What a nice day!\n',
        'Looking great.',
      ]);
    }),
  );

  it.effect('stream char-by-char with tags', ({ expect }) =>
    Effect.gen(function* () {
      const text = 'Hello <b>World</b>!';
      const result = yield* testStreamer(text);
      expect(result).toEqual(['Hello ', '<b>World</b>', '!']);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );

  it.effect('stream keeps hyphenated custom elements intact', ({ expect }) =>
    Effect.gen(function* () {
      const text = 'Before <dom-widget>Hello</dom-widget> after';
      const result = yield* testStreamer(text);
      expect(result).toEqual(['Before ', '<dom-widget>Hello</dom-widget>', ' after']);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );

  it.effect('stream with self-closing tags', ({ expect }) =>
    Effect.gen(function* () {
      const text = 'Hello<br/>world<img src="test.jpg"/>';
      const result = yield* testStreamer(text);
      expect(result).toEqual(['Hello', '<br/>', 'world', '<img src="test.jpg"/>']);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );

  it.effect('stream with incomplete tag fragment', ({ expect }) =>
    Effect.gen(function* () {
      const text = 'Hello <div class="test';
      const result = yield* testStreamer(text);
      expect(result).toEqual(['Hello ', '<div class="test']);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );

  // chunkSize: 'word' subdivides plain-text spans at whitespace boundaries while keeping XML
  // fragments atomic, so widgets still mount on a single CM dispatch.
  it.effect('chunkSize "word" splits text spans into words and whitespace runs', ({ expect }) =>
    Effect.gen(function* () {
      const result = yield* testStreamer('Hello brave new <b>world</b>!', { chunkSize: 'word' });
      expect(result).toEqual(['Hello', ' ', 'brave', ' ', 'new', ' ', '<b>world</b>', '!']);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );

  // chunkSize: 'character' is the smallest cadence — one CM dispatch per character of plain
  // text. XML fragments are still atomic.
  it.effect('chunkSize "character" splits text spans char-by-char and keeps tags atomic', ({ expect }) =>
    Effect.gen(function* () {
      const result = yield* testStreamer('Hi <b>X</b>!', { chunkSize: 'character' });
      expect(result).toEqual(['H', 'i', ' ', '<b>X</b>', '!']);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );

  // Default `chunkSize: 'span'` preserves the original behaviour — tests above already cover it.
  it.effect('chunkSize defaults to "span"', ({ expect }) =>
    Effect.gen(function* () {
      const result = yield* testStreamer('Hello world');
      expect(result).toEqual(['Hello world']);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );
});

const testStreamer = (text: string, options?: StreamerOptions) =>
  Effect.gen(function* () {
    const result: string[] = [];

    // Create a stream from the single text value.
    yield* Stream.make(text).pipe(
      (source) => createStreamer(source, options),
      Stream.runForEach((text) => Effect.sync(() => result.push(text))),
    );

    return result;
  });
