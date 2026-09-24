//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as XtermConsole from './console.ts';
import { TestBridge } from './testing.ts';

describe('console', () => {
  test('writes a line per log', async ({ expect }) => {
    const bridge = new TestBridge();
    await EffectEx.runPromise(Console.log('hello').pipe(Effect.provide(XtermConsole.layer(bridge))));
    expect(bridge.rendered).to.eq('hello\n');
  });

  // Guards the fix for output vanishing: `Console.log` resolves against the `currentServices` fiber
  // ref, so providing the tag with `Layer.succeed` would leave this writing to the host console.
  test('the layer overrides the default console', async ({ expect }) => {
    const bridge = new TestBridge();
    await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* Console.log('first');
        yield* Console.error('second');
      }).pipe(Effect.provide(XtermConsole.layer(bridge))),
    );

    expect(bridge.rendered).to.eq('first\nsecond\n');
  });

  test('joins multiple arguments with a space', async ({ expect }) => {
    const bridge = new TestBridge();
    await EffectEx.runPromise(Console.log('a', 'b', 'c').pipe(Effect.provide(XtermConsole.layer(bridge))));
    expect(bridge.rendered).to.eq('a b c\n');
  });

  test('serializes non-string values', async ({ expect }) => {
    const bridge = new TestBridge();
    await EffectEx.runPromise(Console.log({ id: 1 }).pipe(Effect.provide(XtermConsole.layer(bridge))));
    expect(bridge.rendered).to.contain('"id": 1');
  });

  test('renders an error with its stack', async ({ expect }) => {
    const bridge = new TestBridge();
    const error = new Error('boom');
    await EffectEx.runPromise(Console.error(error).pipe(Effect.provide(XtermConsole.layer(bridge))));
    expect(bridge.rendered).to.contain('boom');
  });

  test('survives a value that cannot be serialized', async ({ expect }) => {
    const bridge = new TestBridge();
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    await EffectEx.runPromise(Console.log(circular).pipe(Effect.provide(XtermConsole.layer(bridge))));
    expect(bridge.rendered).to.contain('object');
  });

  test('clear resets the screen', async ({ expect }) => {
    const bridge = new TestBridge();
    await EffectEx.runPromise(Console.clear.pipe(Effect.provide(XtermConsole.layer(bridge))));
    expect(bridge.writes).to.contain('<clear>');
  });

  test('ANSI escapes pass through untouched', async ({ expect }) => {
    const bridge = new TestBridge();
    await EffectEx.runPromise(Console.log('\x1b[36mcyan\x1b[0m').pipe(Effect.provide(XtermConsole.layer(bridge))));
    expect(bridge.rendered).to.eq('\x1b[36mcyan\x1b[0m\n');
  });
});
