//
// Copyright 2025 DXOS.org
//

import * as Test from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import * as TestContext from 'effect/TestContext';

import { createStreamer, splitFragments, splitSentences, splitSpans } from './stream';

Test.describe('stream', () => {
  Test.it.effect('tokenize tags', ({ expect }) =>
    Effect.gen(function* () {
      {
        expect(splitSpans('A\n<test />\nB')).toEqual(['A\n', '<test />', '\nB']);
        expect(splitSpans('A\n<test>hello</test>\nB')).toEqual(['A\n', '<test>', 'hello', '</test>', '\nB']);
      }
    }),
  );

  Test.it.effect('tokenize fragments', ({ expect }) =>
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
      }
    }),
  );

  Test.it.effect('split sentences', ({ expect }) =>
    Effect.gen(function* () {
      expect(splitSentences('Hello world. What a nice day!\nLooking great.')).toEqual([
        'Hello world. ',
        'What a nice day!\n',
        'Looking great.',
      ]);
    }),
  );

  Test.it.effect('stream char-by-char with tags', ({ expect }) =>
    Effect.gen(function* () {
      const text = 'Hello <b>World</b>!';
      const result = yield* testStreamer(text);
      expect(result).toEqual(['Hello ', '<b>World</b>', '!']);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );

  Test.it.effect('stream with self-closing tags', ({ expect }) =>
    Effect.gen(function* () {
      const text = 'Hello<br/>world<img src="test.jpg"/>';
      const result = yield* testStreamer(text);
      expect(result).toEqual(['Hello', '<br/>', 'world', '<img src="test.jpg"/>']);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );

  Test.it.effect('stream with incomplete tag fragment', ({ expect }) =>
    Effect.gen(function* () {
      const text = 'Hello <div class="test';
      const result = yield* testStreamer(text);
      expect(result).toEqual(['Hello ', '<div class="test']);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );
});

const testStreamer = (text: string) =>
  Effect.gen(function* () {
    const result: string[] = [];

    // Create a stream from the single text value.
    yield* Stream.make(text).pipe(
      createStreamer,
      Stream.runForEach((text) => Effect.sync(() => result.push(text))),
    );

    return result;
  });
